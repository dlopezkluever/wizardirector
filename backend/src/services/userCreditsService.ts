import { supabase } from '../config/supabase.js';

export interface UserCredits {
    id: string;
    userId: string;
    balance: number;
    lowCreditThreshold: number;
    lastTopupAt: string | null;
    lastDeductionAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface UserCreditBalance {
    balance: number;
    lowCreditThreshold: number;
    isLowCredit: boolean;
}

const DEFAULT_STARTING_BALANCE = 100.00;
const DEFAULT_LOW_CREDIT_THRESHOLD = 10.00;

export class UserCreditsService {
    /**
     * Ensure a user has a credits record, creating one if missing
     * Returns the user's credit balance info
     */
    async ensureUserCredits(userId: string): Promise<UserCredits> {
        // First, try to get existing record
        const { data: existing, error: fetchError } = await supabase
            .from('user_credits')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (existing && !fetchError) {
            return this.mapFromDb(existing);
        }

        // Create new record with default balance
        const { data: newRecord, error: insertError } = await supabase
            .from('user_credits')
            .insert({
                user_id: userId,
                balance: DEFAULT_STARTING_BALANCE,
                low_credit_threshold: DEFAULT_LOW_CREDIT_THRESHOLD,
            })
            .select()
            .single();

        if (insertError) {
            // Handle race condition - another request may have created it
            if (insertError.code === '23505') { // Unique violation
                const { data: retryData, error: retryError } = await supabase
                    .from('user_credits')
                    .select('*')
                    .eq('user_id', userId)
                    .single();

                if (retryData && !retryError) {
                    return this.mapFromDb(retryData);
                }
            }
            throw new Error(`Failed to create user credits: ${insertError.message}`);
        }

        if (!newRecord) {
            throw new Error('Failed to create user credits record');
        }

        console.log(`[UserCredits] Created new credits record for user ${userId} with balance ${DEFAULT_STARTING_BALANCE}`);
        return this.mapFromDb(newRecord);
    }

    /**
     * Get user's credit balance with low-credit flag
     */
    async getBalance(userId: string): Promise<UserCreditBalance> {
        const credits = await this.ensureUserCredits(userId);

        return {
            balance: credits.balance,
            lowCreditThreshold: credits.lowCreditThreshold,
            isLowCredit: credits.balance < credits.lowCreditThreshold,
        };
    }

    /**
     * Deduct credits from user's balance
     * Returns the new balance, or throws if insufficient funds
     */
    async deductCredits(userId: string, amount: number): Promise<number> {
        if (amount <= 0) {
            throw new Error('Deduction amount must be positive');
        }

        const credits = await this.ensureUserCredits(userId);

        if (credits.balance < amount) {
            throw new Error(`Insufficient credits: balance ${credits.balance}, requested ${amount}`);
        }

        const newBalance = credits.balance - amount;

        const { data: updated, error: updateError } = await supabase
            .from('user_credits')
            .update({
                balance: newBalance,
                last_deduction_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .select()
            .single();

        if (updateError || !updated) {
            throw new Error(`Failed to deduct credits: ${updateError?.message}`);
        }

        console.log(`[UserCredits] Deducted ${amount} credits from user ${userId}, new balance: ${newBalance}`);
        return newBalance;
    }

    /**
     * Add credits to user's balance (for top-ups)
     */
    async addCredits(userId: string, amount: number): Promise<number> {
        if (amount <= 0) {
            throw new Error('Top-up amount must be positive');
        }

        const credits = await this.ensureUserCredits(userId);
        const newBalance = credits.balance + amount;

        const { data: updated, error: updateError } = await supabase
            .from('user_credits')
            .update({
                balance: newBalance,
                last_topup_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .select()
            .single();

        if (updateError || !updated) {
            throw new Error(`Failed to add credits: ${updateError?.message}`);
        }

        console.log(`[UserCredits] Added ${amount} credits to user ${userId}, new balance: ${newBalance}`);
        return newBalance;
    }

    /**
     * Check if user has sufficient credits for an operation
     */
    async hasSufficientCredits(userId: string, requiredAmount: number): Promise<boolean> {
        const credits = await this.ensureUserCredits(userId);
        return credits.balance >= requiredAmount;
    }

    /**
     * Map database row to TypeScript interface
     */
    private mapFromDb(row: any): UserCredits {
        return {
            id: row.id,
            userId: row.user_id,
            balance: parseFloat(row.balance) || 0,
            lowCreditThreshold: parseFloat(row.low_credit_threshold) || DEFAULT_LOW_CREDIT_THRESHOLD,
            lastTopupAt: row.last_topup_at,
            lastDeductionAt: row.last_deduction_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}

// Export singleton instance
export const userCreditsService = new UserCreditsService();
