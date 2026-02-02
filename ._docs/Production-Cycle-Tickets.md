Prompt:

We have recently implemented the following: , Now I kinda rushed through and did minimal testing of the implementation, so now, I want to take a moment to correct some major issues and handle additional tickets. I want you to help me come up with a ... plan for implementing this 

Please ask me clarification questions about anything that is unclear or concerning. Additioanlly, lets first have a chat to make sure we are on the same page and too brainstorm creative solutions for the more open ended tickets. 

Like Please read these aspects of the prd and think with me how we can improve this experience.

# *Stage 8 of Pipeline & Phase 5 of tasklist related tickets.*


## 1.  

### 1a. You refresh the page and it moves you back to stage 7, and you can't even go to stage 8 without unlocking stage 7 and then "relocking"? Why is this? THus, the current functionality of the locking is purely tedious and unhelpful.

### 1b. when you generate a changed Scene instance image, it does not appear in the Stage8 Ui unless you refresh the page. Like the image generated doesn't automatically pop up once its doen generating (in the Scene instance image); thus it's quite shit cause you have to refresh the page to be able to get it to register with the system that the image exists, AND then yuo can lock the asset. (and currently you have to go through the whole rigamoaroll of "You refresh the page and it moves you back to stage 7, and you can't even go to stage 8 without unlocking stage 7 and then "relocking"?" )

## 1c.The "New suggested" scene assets disappear if you go back to the shot list & then  return  to stage 8; and there is no way to bring them back.


## 2. Regarding Status tage
### 2a.  The tags get wiped out, at least in the UI, when you lock stage 8; like there is no way to keep the tags with an asset it seems, because after you add a few, when you lock the asset, all the tags are removed and, weirdly "locked" becomes the status.

### 2b. Would be nice to have the capabilty to use the arrow keys to move down the dropdown list of the status tags; like if you type "b", there will be a list of possible conditions to choose, it would be really nice if pressing enter automatically selected the top option, and pressing the tab or the down arrow automatically moved you down the list (pressing enter still selects whatever the selection is on)

## 3. 

### 3a. No access to master project assets UNLESS they are extracted by the automatic extractor

### 3b. Both the Create a New Scene Asset & Add From Project Assets (from the right sidebar) only open a drawer to a the golobal Asset Library. There is no way to access the project assets, which should be the easiest to access, don't you think

## 4. The "New suggested" scene assets disappear if you go back to the shot list & then  return  to stage 8; and there is no way to bring them back.

## 5. It would be nice to have the scene slug & scene number present on the Stage 8 UI, like for the user to know whats going on in case they forgot. 



More Complex & Open-Ended / Creative Tickets:


But let's think about what the user will need in full for the best stage 8 expeirence, shall we?

## 1. Master Asset's Influnce on the Scene Instance Image

### 1a. ## Not sure the master assset image is effecting the Scene instance image as it should, while the visual style capsule seems to have TOO MUCH influence. let's inestigate how we can tailor this more finally 

## There is no rearview-mirror present for scenes where the previous has not been made; what if instead it show cased the latest assets from the previous scenes; OR Even better, the showed each asset & thier various previous modifications done in previous scenes, prvious Scene instance image's that we generated. That way that image could be pulled and bacome the new "master reference for assset

## There should be the option for the user to just use the master reference AS IS for the scene instance, you shouldn't be forced to use the general 

The scene instance seems to be uninfluenced by the masster asset image
(Scene instance image
Launchpad in scene
Audit trail
Modifications: 2 • Last field: image_key_url). See here, wouldn't it be nice to be able to see the various generations made, and choose your favorite. Like, say you generate a scene instance image once, and eh, it's good not great, so you try it again and its worse, so you try it a third time, and hey its pretty good, but maybe not better then the first try, wouldn't it be ideal for the user to have a carasoul to choose from below.



## 2. Broadly Speaking

## This seems completely disconnected to the shot list scene; like outside of the basic "extraction" that occurs how is the prior information of the "scene" and "shot-list" helping with things like the visual style decription/captions?"

## Can't lock and proceed without generating each and every asset; which is annoyingful, as the point of stage 8 is just to add a "final polish" of the assets which you cared about getting right, so if there stuff you don't care about, you could just proceed without worrying about /customizing it; like just move forward

## 
Additionally, the "Visual State Description" Would be i deal if could automatically have the correct "description" generated to describe what the state of the asset needed to be in for the scene, using infrencing/ the prior context of the scene "

## We are trying to make the lives of the animator easier ; master image added should be the key feature added 

## lets discuss the rearview mirror, Is it really all that usefull 