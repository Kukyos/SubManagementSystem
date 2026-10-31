export const INTRO_KEY = "brightloop:intro";

// Runs before first paint (inlined in the page) so the loader shows only on a
// visitor's first landing per session and never for reduced motion.
export const INTRO_SCRIPT = `try{var r=document.documentElement;if(!sessionStorage.getItem("${INTRO_KEY}")&&!matchMedia("(prefers-reduced-motion: reduce)").matches)r.dataset.intro="playing"}catch(e){}`;
