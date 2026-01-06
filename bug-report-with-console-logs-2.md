
## 1. **I was able to make a new project and proceed through stage 1, button moving to stage 2, got this error in the console, as no treatment was generated: 

"""
 POST http://localhost:8080/api/llm/generate-from-template 404 (Not Found)

Stage2Treatment.tsx:173 Failed to generate treatments: Error: No active template found with name: treatment_expansion
    at TreatmentService.generateTreatments (treatmentService.ts:75:13)
    at async generateInitialTreatments (Stage2Treatment.tsx:154:22)
    at async initializeTreatments (Stage2Treatment.tsx:111:9)"""

---