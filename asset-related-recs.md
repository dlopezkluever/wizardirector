# Recommendation 1: 
  We also need to concern ourselves with um, Mis-ssigned asset types. See, in my testing experience, its very common in these large extractions of assets done ins stage 5,taken from the script, that there will be alot of mis-assigned items/assets. We can already delete and defer assets in stage 5, as well, I THINK IM NOT ACTUALLY SURE, that you can combine assets, BUT ONLY when they are both of the same kind of asset (a character can be merged with another character), but sometimes, an asset will be extracted as seperate assets for whatever reason, like for example
  
   You see character designated as a prop. or, you know, props signed as characters, or as a location. this is common when a character or location is also referenced in the script in a paragaph/description element, where the extraction will mistake it for a prop. Or also, in the script when a character is only addressed by maybe the first name, it's attributed to something different than the first and last name asset, like it will think its a different character. Again, there needs to just be a way that, for the user to kind of consolidate them all into one asset. You know, so, for instance, if you have, like, John Smith, that gets extracted as one character as it, and then later in the script, you know, they refer to John doing something. very common. John wouldn't be extracted as a new asset instead of being attributed as part of that greater just John Smith character. So again, we just need the ability to kind of take multiple different aspects that are most directed on. bring them into just one entity. Uh, and again, the ability to do that, not just to character assets, but instead it could also be combining a character with a prop, that, again, might have just been diagnosed as such because of, you know, misunderstanding in the extraction process. 

   Now what about transfomration events; this maybe to much of an edge case, like it may not be possible.  For example, in a scene that I'm working with ersonally in testing, it has the main character in a scene transforming into a garden gnome. the issue is: in the asset extraction, both the character and the garden gnome were extracted as 2 separate assets, wuth the garden gnome being labeled a prop. So, as you can see with this example, it would be ideal to be able to combine them, you know, the garden gnome into the character. Uh, like, basically treat them as one character asset or like the context being that in a shot, but also be able to register that  there eill be a kind of a transformation that occurs. Um, I hope that kind of clarifies what we're going for. But i recognize that this maybe too tricky, and may just have to be something the user has to handle, bu deleting an asset and just making a transformation event in stage 8; idk this is going to take alot of brainstorming 


# Recommendation 2: 
Okay, so a work around that may work for the, uh, image generation when there is a myriad of assets that need to be included in a frame, is to basically have a multi-pass generation process. Like say there are like 8 different assets that need to be included in a starting frame. Maybe we could have the image generator first generate a frame that puts to use the location and maybe the key characters. Then using that frame as the starting point / reference image, we can generate another image that includes more assets, and so forth, until all the assets are included in the final product for the frame. I believe, that the location  asset, tailored to be what the scene expects, and the main characters assets, framed in the misc-en-scene correctly should take priority, with location taking, the highest priority (like we want the enviorment generated correctly) and then, uh, the character assets. And then lastly, the uh, or props. (so for example, generation used the location asset and the main foreground chracters as the only reference for the first generation, and then, uses that image generation with instructions to add addional assets (up to 3 or 4 at a time) to make the next image (say background character and props), and then agian, with the next 3-4 being added, until we get what we want. 

In other words, 8 assets, it may be difficult to spend it all under one pass to a image generator and get a reliable product. So instead, if you broke it up into multiple generations, Again, with the goal, getting the location and the key characters in the frame, in the correct position, in the 1st run, and then doing a subsequent run with the other assets. Until you get ultimately everything needs to be in the frame, in the Final product.

I need you to do research to understand what the best way to do generations that need a bunch of assets is, because maybe what im suggesting is wrong, maybe you can just add like 8 assets at once, or maybe you can really only do 2 at a time, like I don't actually know, im recommending based on gut instict, but research online to see if this is a pragmatic way to handle edge cases like this.


--- not submittted---

4. I don't really know, the ideal behavior would be a sort of agentic inferencing,
     where like an agent could read the script and know from context clues whether
     a transformation occured or not; but then again, if the service was able to  be
     that agentic, then it could probably not mis assign assets to begin with... so
     maybe we need to think that maybe some extractions just need to be deleted and
     added as transformations later  
















     