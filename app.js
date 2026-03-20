const CATEGORY_META = {
  all:{label:"All", short:"ALL"},
  push:{label:"Push", short:"PUSH"},
  legs:{label:"Legs", short:"LEGS"},
  core:{label:"Core", short:"CORE"},
  mobility:{label:"Mobility", short:"MOVE"},
  posture:{label:"Posture", short:"POST"},
  cardio:{label:"Cardio", short:"CARD"},
  balance:{label:"Balance", short:"BAL"}
};

const CATEGORY_ORDER = ["all","push","legs","core","mobility","posture","cardio","balance"];
const MAX_DECK = 16;
const BALANCE_GROUPS = CATEGORY_ORDER.filter(key => key !== "all");

const state = {
  deck: [],
  focusedDeckId: null,
  focusedLibraryId: null,
  highlightedMuscle: null,
  search: "",
  category: "all",
  visibleIds: [],
  workoutDeck: [],
  workoutTimes: [],
  currentIndex: 0,
  completed: new Set(),
  autoEnabled: false,
  autoDefaultSecs: 60,
  autoBaseSecs: [],
  autoExtraSecs: [],
  autoAdvancePending: false,
  autoAdvanceTimeout: null,
  audioCtx: null,
  activeFunFactCardId: null,
  activeFunFactText: "",
  running: false,
  interval: null,
  infoAnchor: null,
  dragSession: null,
  suppressClickUntil: 0
};

const els = {
  windowFrame: document.querySelector(".window"),
  builderScreen: document.getElementById("builderScreen"),
  workoutScreen: document.getElementById("workoutScreen"),
  summaryScreen: document.getElementById("summaryScreen"),
  workoutTop: document.querySelector(".workout-top"),
  activeTop: document.querySelector(".active-top"),
  handCountBubble: document.getElementById("handCountBubble"),
  deckSurface: document.getElementById("deckSurface"),
  deckDropZone: document.getElementById("deckDropZone"),
  deckMetaChip: document.getElementById("deckMetaChip"),
  searchInput: document.getElementById("searchInput"),
  librarySuggestions: document.getElementById("librarySuggestions"),
  homeBtn: document.getElementById("homeBtn"),
  differentTenBtn: document.getElementById("differentTenBtn"),
  filterStrip: document.getElementById("filterStrip"),
  libraryGrid: document.getElementById("libraryGrid"),
  libraryMeta: document.getElementById("libraryMeta"),
  drawSevenBtn: document.getElementById("drawSevenBtn"),
  drawOneBtn: document.getElementById("drawOneBtn"),
  clearDeckBtn: document.getElementById("clearDeckBtn"),
  startWorkoutBtn: document.getElementById("startWorkoutBtn"),
  handBalanceDock: document.getElementById("handBalanceDock"),
  balancePopupBtn: document.getElementById("balancePopupBtn"),
  handBalanceMeta: document.getElementById("handBalanceMeta"),
  handBalanceList: document.getElementById("handBalanceList"),
  exerciseTimer: document.getElementById("exerciseTimer"),
  totalTimerLine: document.getElementById("totalTimerLine"),
  remainingMeta: document.getElementById("remainingMeta"),
  doneMeta: document.getElementById("doneMeta"),
  remainingPile: document.getElementById("remainingPile"),
  remainingList: document.getElementById("remainingList"),
  donePile: document.getElementById("donePile"),
  doneList: document.getElementById("doneList"),
  cardPosition: document.getElementById("cardPosition"),
  activeCardSlot: document.getElementById("activeCardSlot"),
  activeFunFactWrap: document.getElementById("activeFunFactWrap"),
  activeFunFactLabel: document.getElementById("activeFunFactLabel"),
  activeFunFact: document.getElementById("activeFunFact"),
  autoCountdown: document.getElementById("autoCountdown"),
  autoToggleBtn: document.getElementById("autoToggleBtn"),
  auto1Btn: document.getElementById("auto1Btn"),
  auto2Btn: document.getElementById("auto2Btn"),
  auto3Btn: document.getElementById("auto3Btn"),
  autoAdd30Btn: document.getElementById("autoAdd30Btn"),
  autoMeta: document.getElementById("autoMeta"),
  activeHowTo: document.getElementById("activeHowTo"),
  activeTip: document.getElementById("activeTip"),
  timerPanel: document.querySelector(".timer-panel"),
  activeActions: document.querySelector(".active-actions"),
  pauseBtn: document.getElementById("pauseBtn"),
  finishBtn: document.getElementById("finishBtn"),
  doneBtn: document.getElementById("doneBtn"),
  progressRingFill: document.getElementById("progressRingFill"),
  summaryFan: document.getElementById("summaryFan"),
  summaryTime: document.getElementById("summaryTime"),
  summaryCompleted: document.getElementById("summaryCompleted"),
  barList: document.getElementById("barList"),
  summaryExerciseList: document.getElementById("summaryExerciseList"),
  mostWorkedCard: document.getElementById("mostWorkedCard"),
  backToBuilderBtn: document.getElementById("backToBuilderBtn"),
  infoPopup: document.getElementById("infoPopup"),
  infoPopupTitle: document.getElementById("infoPopupTitle"),
  infoPopupHowTo: document.getElementById("infoPopupHowTo"),
  infoPopupTip: document.getElementById("infoPopupTip"),
  infoPopupCouplet: document.getElementById("infoPopupCouplet"),
  infoPopupHide: document.getElementById("infoPopupHide")
};

function byId(id){ return EXERCISES.find(x => x.id === id); }
function shuffle(arr){
  const copy = [...arr];
  for(let i = copy.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function formatTime(total){
  const m = String(Math.floor(total / 60)).padStart(2,"0");
  const s = String(total % 60).padStart(2,"0");
  return `${m}:${s}`;
}
function totalElapsed(){
  return state.workoutTimes.reduce((a,b)=>a+b,0);
}
function currentAutoTargetSecs(){
  return (state.autoBaseSecs[state.currentIndex] || 0) + state.autoDefaultSecs + (state.autoExtraSecs[state.currentIndex] || 0);
}
function clearAutoAdvancePending(){
  state.autoAdvancePending = false;
  if(state.autoAdvanceTimeout){
    clearTimeout(state.autoAdvanceTimeout);
    state.autoAdvanceTimeout = null;
  }
}
function playAutoChime(){
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if(!AudioCtx) return;
  if(!state.audioCtx) state.audioCtx = new AudioCtx();
  const ctx = state.audioCtx;
  const now = ctx.currentTime;
  if(ctx.state === "suspended"){
    ctx.resume().catch(() => {});
  }
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(660, now + 0.18);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.25);
}
function getMuscleScores(ids, {secondaryWeight=0.5} = {}){
  const scores = {};
  ids.forEach(id => {
    const ex = byId(id);
    if(!ex) return;
    ex.primary.forEach(m => scores[m] = (scores[m] || 0) + 1);
    ex.secondary.forEach(m => scores[m] = (scores[m] || 0) + secondaryWeight);
  });
  return scores;
}
function getBalanceGroupsForExercise(ex){
  return new Set([ex.category]);
}
function getBalanceGroupScores(ids){
  const scores = Object.fromEntries(BALANCE_GROUPS.map(label => [label, 0]));
  ids.forEach(id => {
    const ex = byId(id);
    if(!ex) return;
    getBalanceGroupsForExercise(ex).forEach(label => {
      scores[label] += 1;
    });
  });
  return scores;
}
function populateSuggestions(){
  const curated = [
    "Push", "Legs", "Core", "Mobility", "Posture", "Cardio", "Balance",
    "Chest", "Shoulders", "Triceps", "Quads", "Glutes", "Hamstrings", "Calves",
    "Abs", "Obliques", "Lower Back", "Upper Back", "T-Spine", "Hips", "Ankles",
    "Push-Ups", "Squats", "Lunges", "Plank", "Mobility", "Balance"
  ];
  const ordered = [];
  const seen = new Set();
  [...curated, ...EXERCISES.flatMap(ex => [ex.title, ex.category, ...ex.primary, ...ex.secondary])].forEach(label => {
    const trimmed = String(label).trim();
    const key = trimmed.toLowerCase();
    if(!trimmed || seen.has(key)) return;
    seen.add(key);
    ordered.push(trimmed);
  });
  els.librarySuggestions.innerHTML = ordered.slice(0, 60).map(value => `<option value="${value}"></option>`).join("");
}
function getFilteredExercises(){
  const q = state.search.trim().toLowerCase();
  return EXERCISES.filter(ex => {
    if(state.category !== "all" && ex.category !== state.category) return false;
    if(!q) return true;
    const hay = [
      ex.title,
      ex.category,
      ...ex.primary,
      ...ex.secondary
    ].join(" ").toLowerCase();
    return hay.includes(q);
  });
}
function getAvailableLibraryExercises(){
  return getFilteredExercises().filter(ex => !state.deck.includes(ex.id));
}
function sampleIds(list, count){
  if(list.length <= count) return list.map(x => x.id);
  const shuffled = shuffle(list.map(x => x.id));
  return shuffled.slice(0, count);
}
function pickVisibleBatch(){
  const available = getAvailableLibraryExercises();
  state.visibleIds = sampleIds(available, 10);
  renderLibrary();
}
function setScreen(name){
  for(const el of [els.builderScreen, els.workoutScreen, els.summaryScreen]){
    el.classList.remove("active");
  }
  els[name].classList.add("active");
  if(name !== "workoutScreen"){
    els.windowFrame.classList.remove("is-paused-tone");
  }
}
function syncResponsiveWorkoutTimer(){
  if(!els.activeTop.contains(els.timerPanel)){
    els.activeTop.appendChild(els.timerPanel);
  }
}
function addToDeck(id){
  if(state.deck.includes(id) || state.deck.length >= MAX_DECK) return;
  state.deck = [...state.deck, id];
  if(state.focusedLibraryId === id) state.focusedLibraryId = null;
  renderDeck();
  renderLibrary();
}
function insertIntoDeck(id, index = state.deck.length){
  if(state.deck.includes(id) || state.deck.length >= MAX_DECK) return;
  const next = [...state.deck];
  const clampedIndex = Math.max(0, Math.min(next.length, index));
  next.splice(clampedIndex, 0, id);
  state.deck = next;
  renderDeck();
  renderLibrary();
}
function removeFromDeck(id){
  state.deck = state.deck.filter(x => x !== id);
  if(state.focusedDeckId === id) state.focusedDeckId = null;
  renderDeck();
  renderLibrary();
}
function moveDeckCard(id, index = state.deck.length - 1){
  const currentIndex = state.deck.indexOf(id);
  if(currentIndex === -1) return;
  const next = [...state.deck];
  next.splice(currentIndex, 1);
  const clampedIndex = Math.max(0, Math.min(next.length, index));
  next.splice(clampedIndex, 0, id);
  state.deck = next;
  renderDeck();
  renderLibrary();
}
function focusDeckCard(id){
  if(!state.deck.includes(id)) return;
  state.focusedDeckId = state.focusedDeckId === id ? null : id;
  renderDeck();
}
function focusLibraryCard(id){
  const available = getAvailableLibraryExercises();
  if(!available.some(ex => ex.id === id)){
    state.focusedLibraryId = null;
    renderLibrary();
    return;
  }
  state.focusedLibraryId = state.focusedLibraryId === id ? null : id;
  renderLibrary();
}
function toggleHighlightedMuscle(muscle){
  state.highlightedMuscle = state.highlightedMuscle === muscle ? null : muscle;
  renderHandBalance();
  renderDeck();
}
function clearBuilderDragState(){
  els.deckDropZone.classList.remove("drag-over");
  document.querySelectorAll(".dragging,.drag-over").forEach(el => {
    el.classList.remove("dragging", "drag-over");
  });
}
function shouldSuppressClick(){
  return Date.now() < state.suppressClickUntil;
}
function makeDragGhost(sourceEl, x, y){
  const ghost = sourceEl.cloneNode(true);
  ghost.classList.add("drag-ghost");
  ghost.removeAttribute("role");
  ghost.removeAttribute("tabindex");
  document.body.appendChild(ghost);
  positionDragGhost(ghost, x, y);
  return ghost;
}
function positionDragGhost(ghost, x, y){
  if(!state.dragSession) return;
  ghost.style.left = `${x - state.dragSession.offsetX}px`;
  ghost.style.top = `${y - state.dragSession.offsetY}px`;
}
function getBuilderDropTarget(x, y){
  const hit = document.elementFromPoint(x, y);
  if(!hit) return {kind:"none"};
  const deckCard = hit.closest(".deck-card");
  if(deckCard && els.deckSurface.contains(deckCard)){
    return {
      kind:"deck-card",
      element:deckCard,
      index:Number(deckCard.dataset.deckIndex || 0)
    };
  }
  if(hit.closest("#deckDropZone")) return {kind:"deck-zone"};
  if(hit.closest(".library-top")) return {kind:"library"};
  return {kind:"none"};
}
function highlightBuilderDropTarget(target, sourceEl){
  clearBuilderDragState();
  if(!state.dragSession) return;
  state.dragSession.sourceEl.classList.add("dragging");
  if(target.kind === "deck-card" && target.element !== sourceEl){
    target.element.classList.add("drag-over");
    return;
  }
  if(target.kind === "deck-zone" || (target.kind === "deck-card" && target.element === sourceEl)){
    els.deckDropZone.classList.add("drag-over");
  }
}
function finishBuilderPointerDrag(ev){
  const session = state.dragSession;
  if(!session || ev.pointerId !== session.pointerId) return;
  window.removeEventListener("pointermove", handleBuilderPointerMove);
  window.removeEventListener("pointerup", finishBuilderPointerDrag);
  window.removeEventListener("pointercancel", finishBuilderPointerDrag);
  if(session.sourceEl.releasePointerCapture){
    try{ session.sourceEl.releasePointerCapture(session.pointerId); }catch(err){}
  }
  if(session.didDrag){
    state.suppressClickUntil = Date.now() + 250;
    const target = getBuilderDropTarget(ev.clientX, ev.clientY);
    if(target.kind === "deck-card"){
      let insertIndex = ev.clientX < target.element.getBoundingClientRect().left + target.element.getBoundingClientRect().width / 2
        ? target.index
        : target.index + 1;
      if(session.meta.type === "library"){
        insertIntoDeck(session.meta.id, insertIndex);
      } else if(session.meta.type === "deck"){
        const currentIndex = state.deck.indexOf(session.meta.id);
        if(currentIndex !== -1 && currentIndex < insertIndex) insertIndex -= 1;
        moveDeckCard(session.meta.id, insertIndex);
      }
    } else if(target.kind === "deck-zone"){
      if(session.meta.type === "library") insertIntoDeck(session.meta.id, state.deck.length);
      if(session.meta.type === "deck") moveDeckCard(session.meta.id, state.deck.length);
    } else if(target.kind === "library" && session.meta.type === "deck"){
      removeFromDeck(session.meta.id);
    }
  }
  if(session.ghost) session.ghost.remove();
  state.dragSession = null;
  clearBuilderDragState();
}
function handleBuilderPointerMove(ev){
  const session = state.dragSession;
  if(!session || ev.pointerId !== session.pointerId) return;
  const dx = ev.clientX - session.startX;
  const dy = ev.clientY - session.startY;
  if(!session.didDrag && Math.hypot(dx, dy) < 8) return;
  if(!session.didDrag){
    session.didDrag = true;
    session.sourceEl.classList.add("dragging");
    session.ghost = makeDragGhost(session.sourceEl, ev.clientX, ev.clientY);
  }
  positionDragGhost(session.ghost, ev.clientX, ev.clientY);
  const target = getBuilderDropTarget(ev.clientX, ev.clientY);
  highlightBuilderDropTarget(target, session.sourceEl);
}
function beginBuilderPointerDrag(ev, meta, sourceEl){
  if(ev.button !== undefined && ev.button !== 0) return;
  if(ev.target.closest(".card-info-toggle,.card-remove-toggle")) return;
  state.dragSession = {
    pointerId: ev.pointerId,
    meta,
    sourceEl,
    startX: ev.clientX,
    startY: ev.clientY,
    offsetX: ev.clientX - sourceEl.getBoundingClientRect().left,
    offsetY: ev.clientY - sourceEl.getBoundingClientRect().top,
    didDrag: false,
    ghost: null
  };
  if(sourceEl.setPointerCapture){
    try{ sourceEl.setPointerCapture(ev.pointerId); }catch(err){}
  }
  window.addEventListener("pointermove", handleBuilderPointerMove);
  window.addEventListener("pointerup", finishBuilderPointerDrag);
  window.addEventListener("pointercancel", finishBuilderPointerDrag);
}
function formatList(list){
  if(!list.length) return "";
  if(list.length === 1) return list[0];
  if(list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
}
function hasKeyword(title, keywords){
  const lower = title.toLowerCase();
  return keywords.some(word => lower.includes(word));
}
function describeExerciseShape(ex){
  const title = ex.title.toLowerCase();
  if(ex.category === "push"){
    if(hasKeyword(title, ["scap", "scapular"])) return "This is a small plank-based shoulder-blade drill where the arms stay straight while the chest subtly sinks and presses away.";
    if(hasKeyword(title, ["pike"])) return "This is an upside-down push-up variation with hips high, so the body forms an inverted V and the head lowers toward the floor.";
    if(hasKeyword(title, ["down dog"])) return "This starts from a downward-dog-like shape, with hips high and the upper body doing most of the pressing.";
    if(hasKeyword(title, ["hindu"])) return "This is a flowing push-up where the body dives forward from hips-high into a lifted chest position.";
    if(hasKeyword(title, ["shoulder tap"])) return "This is a plank hold with alternating hand taps to the opposite shoulder.";
    if(hasKeyword(title, ["wall"])) return "This is a standing incline push-up done against a wall.";
    return "This is a push-up pattern where you lower the body with the hands on the floor and press back up.";
  }
  if(ex.category === "legs"){
    if(hasKeyword(title, ["wall sit"])) return "This is a static squat hold with your back supported on a wall and knees bent.";
    if(hasKeyword(title, ["squat"])) return "This is a squat pattern where you bend the knees and hips to sit down and then stand back up.";
    if(hasKeyword(title, ["lunge", "split squat", "curtsy"])) return "This is a staggered-stance leg exercise where one leg works in front and one behind as you lower and rise.";
    if(hasKeyword(title, ["bridge"])) return "This is a floor-based hip lift done on your back with knees bent and feet planted.";
    if(hasKeyword(title, ["calf"])) return "This is a standing ankle raise where you lift the heels and balance on the balls of the feet.";
    if(hasKeyword(title, ["hinge", "good morning"])) return "This is a hip-hinge move where the hips fold back while the spine stays long.";
    if(hasKeyword(title, ["airplane"])) return "This is a single-leg hinge variation where the body tips forward while you balance and control the hips.";
    return "This is a lower-body move built around squatting, hinging, stepping, or balancing through the legs.";
  }
  if(ex.category === "core"){
    if(hasKeyword(title, ["plank"])) return "This is a straight-body hold supported by the hands or forearms, with the trunk resisting sagging or twisting.";
    if(hasKeyword(title, ["bear crawl"])) return "This is a hovering tabletop hold with knees off the floor and the trunk braced.";
    if(hasKeyword(title, ["dead bug"])) return "This is a back-on-floor core drill where opposite arm and leg reach away while the trunk stays still.";
    if(hasKeyword(title, ["bird dog"])) return "This is an all-fours balance drill where opposite arm and leg extend long from the body.";
    if(hasKeyword(title, ["mountain climber"])) return "This is a fast plank variation where the knees drive toward the chest one at a time.";
    if(hasKeyword(title, ["hollow"])) return "This is a curved-body hold on your back with shoulders and legs lifted off the floor.";
    if(hasKeyword(title, ["v-up"])) return "This is an abdominal fold where the upper body and legs lift toward each other.";
    if(hasKeyword(title, ["flutter"])) return "This is a floor core drill with straight or nearly straight legs making small alternating kicks.";
    if(hasKeyword(title, ["reverse crunch"])) return "This is an ab move where the knees or pelvis curl upward toward the torso from the floor.";
    if(hasKeyword(title, ["toe touch"])) return "This is a crunch variation where the hands reach toward raised feet.";
    if(hasKeyword(title, ["bicycle"])) return "This is a twisting crunch where elbow and opposite knee move toward each other in alternation.";
    return "This is a trunk-control exercise where the middle of the body has to brace, curl, or resist movement.";
  }
  if(ex.category === "mobility"){
    if(hasKeyword(title, ["cat-cow"])) return "This is a hands-and-knees spinal mobility drill where the back rounds and arches in sequence.";
    if(hasKeyword(title, ["open book", "rotation", "thread the needle"])) return "This is a rotation drill where the chest and upper back turn while the rest of the body stays relatively stable.";
    if(hasKeyword(title, ["90/90"])) return "This is a seated hip mobility drill with both knees bent on the floor in front and to the side.";
    if(hasKeyword(title, ["ankle"])) return "This is an ankle mobility drill where the knee shifts over the foot to open the joint.";
    if(hasKeyword(title, ["downward dog"])) return "This is an inverted stretch shape with hands and feet on the floor and hips lifted high.";
    if(hasKeyword(title, ["lunge", "reach"])) return "This is a long split-stance stretch that opens the front of the hip while the torso reaches.";
    return "This is a controlled range-of-motion drill meant to open a joint rather than fatigue a muscle.";
  }
  if(ex.category === "posture"){
    if(hasKeyword(title, ["angel", "snow angel"])) return "This is an arm sweep pattern meant to train the shoulders and upper back to move cleanly overhead and back down.";
    if(hasKeyword(title, ["swimmer"])) return "This is a face-down upper-back drill where the arms move through a swimming-like path.";
    if(hasKeyword(title, ["raise"])) return "This is a light upper-back lift where the arms rise into a Y or T shape while the torso stays controlled.";
    if(hasKeyword(title, ["chin tuck"])) return "This is a small neck-position drill where the head slides straight back without tipping.";
    if(hasKeyword(title, ["cobra"])) return "This is a gentle prone back extension where the chest lifts off the floor.";
    if(hasKeyword(title, ["retraction"])) return "This is a shoulder-blade squeeze drill that trains the upper back to pull the shoulders back.";
    if(hasKeyword(title, ["scap push"])) return "This is a posture-focused plank drill where the shoulder blades glide without big elbow movement.";
    return "This is an upper-back and alignment drill meant to train cleaner posture and shoulder positioning.";
  }
  if(ex.category === "cardio"){
    if(hasKeyword(title, ["jack"])) return "This is a quick repeated jumping or stepping pattern where the feet move apart and together.";
    if(hasKeyword(title, ["high knees"])) return "This is running in place with the knees lifting higher than a normal jog.";
    if(hasKeyword(title, ["butt kicks"])) return "This is a running-in-place drill where the heels cycle up toward the glutes.";
    if(hasKeyword(title, ["march"])) return "This is a lighter cardio drill where the legs drive rhythmically without full running impact.";
    if(hasKeyword(title, ["boxing"])) return "This is a light bouncing footwork pattern paired with quick boxing-style arm action.";
    if(hasKeyword(title, ["shuffle", "skater", "carioca"])) return "This is a lateral cardio pattern where the body moves side to side instead of just straight up and down.";
    if(hasKeyword(title, ["burpee", "squat thrust"])) return "This is a full-body cardio move that drops to the floor and returns to standing in one flowing rep.";
    if(hasKeyword(title, ["pogo"])) return "This is a quick springy bounce done mostly from the ankles.";
    return "This is a faster-paced conditioning move meant to raise the heart rate through repeated rhythmic motion.";
  }
  if(hasKeyword(title, ["toe yoga"])) return "This is a foot-control drill where the toes lift or press in different combinations while you stay mostly in place.";
  if(hasKeyword(title, ["walk"])) return "This is a slow balance walk where each step is placed carefully to challenge control.";
  if(hasKeyword(title, ["reach", "tap", "hinge", "airplane"])) return "This is a balance drill where one leg stabilizes while the other leg or the hands reach away from the body.";
  return "This is a balance exercise where one leg or a narrow base of support forces you to stay steady without rushing.";
}
function buildPushInfo(ex){
  const title = ex.title.toLowerCase();
  if(hasKeyword(title, ["scap", "scapular"])){
    return {
      howTo: "Start in a straight-arm plank with elbows locked. Without bending the arms, let the chest sink slightly as the shoulder blades come together, then press the floor away to spread them apart again.",
      tip: "Keep the neck long and ribs tucked so the motion stays in the shoulder blades rather than the low back.",
      couplet: "Let the shoulder blades slide, then press them wide.\nSmall moves done clean are a stronger guide."
    };
  }
  if(hasKeyword(title, ["pike", "down dog", "hindu"])){
    return {
      howTo: "Begin with hips high and hands planted firmly. Bend the elbows to bring the head and chest through the line of the hands, then press back up with control, keeping the shoulders active the whole time.",
      tip: "Think of lowering the crown of the head between the hands, not collapsing the chest toward the floor.",
      couplet: "Hips high, head through, keep the line true.\nPress the ground away and rise on cue."
    };
  }
  if(hasKeyword(title, ["shoulder tap"])){
    return {
      howTo: "Set up in a strong plank or push-up position. Shift just enough weight to one side to tap the opposite shoulder, then alternate without letting the hips rock side to side.",
      tip: "Widen the feet if needed so the body stays square while you tap.",
      couplet: "Tap with control and keep the hips still.\nQuiet in the middle shows real skill."
    };
  }
  if(hasKeyword(title, ["wall"])){
    return {
      howTo: "Place the hands on a wall at chest height and walk the feet back until the body makes a straight line. Lower the chest toward the wall by bending the elbows, then press back to the start.",
      tip: "Keep the body in one piece from head to heel instead of sagging at the hips.",
      couplet: "Wall in front and body tall.\nPress with purpose, steady through it all."
    };
  }
  return {
    howTo: "Set up in a solid plank with hands just outside shoulder width. Lower the chest under control, keeping the body straight, then press back up until the elbows extend and the top position feels stacked.",
    tip: "Brace the abs and squeeze the glutes so the body rises as one unit instead of peeling up in pieces.",
    couplet: "Chest stays proud and elbows track right.\nLower with care, then press with might."
  };
}
function buildLegsInfo(ex){
  const title = ex.title.toLowerCase();
  if(hasKeyword(title, ["squat", "wall sit"])){
    return {
      howTo: "Stand with feet about hip to shoulder width apart and sit the hips back as the knees bend. Keep the chest up, push through the whole foot, and stand tall again with control.",
      tip: "Let the knees travel naturally, but keep them pointing in the same direction as the toes.",
      couplet: "Sit back low and drive to stand.\nStrong through the feet, steady through the land."
    };
  }
  if(hasKeyword(title, ["lunge", "split squat", "curtsy"])){
    return {
      howTo: "Take a long enough stance that both knees can bend comfortably. Lower straight down with the torso tall, then drive through the front foot to return without wobbling.",
      tip: "Think elevator, not escalator. Go down and up rather than drifting far forward.",
      couplet: "Drop with control, then rise with ease.\nFront foot rooted, hips and knees."
    };
  }
  if(hasKeyword(title, ["bridge"])){
    return {
      howTo: "Lie on your back with feet planted and knees bent. Brace the middle, drive through the heels, and lift the hips until the body forms a long line from shoulders to knees.",
      tip: "Exhale at the top and avoid arching the low back to steal the work from the glutes.",
      couplet: "Heels dig in and hips climb high.\nGlutes do the work, not the low back's try."
    };
  }
  if(hasKeyword(title, ["calf"])){
    return {
      howTo: "Stand tall and press through the balls of the feet to rise onto the toes. Pause briefly at the top, then lower all the way down under control.",
      tip: "Move straight up and down rather than rolling to the outer edges of the feet.",
      couplet: "Rise on the toes, then lower slow.\nSmall range, sharp work, and the calves will know."
    };
  }
  if(hasKeyword(title, ["hinge", "good morning", "airplane"])){
    return {
      howTo: "Soften the knees and push the hips straight back while the spine stays long. Stop when you feel the hamstrings load, then drive the hips forward to return to standing.",
      tip: "Imagine closing a car door with your hips so the hinge stays in the hips rather than the knees.",
      couplet: "Hips drift back and spine stays long.\nSnap to tall and finish strong."
    };
  }
  return {
    howTo: "Move with the feet grounded and let the hips do most of the work. Keep the torso organized, control the lowering phase, and finish each rep by returning to a tall balanced stance.",
    tip: "Use full-foot pressure so the knees, hips, and ankles share the load cleanly.",
    couplet: "Ground the feet and move with grace.\nStrong legs built at a measured pace."
  };
}
function buildCoreInfo(ex){
  const title = ex.title.toLowerCase();
  if(hasKeyword(title, ["plank", "bear crawl"])){
    return {
      howTo: "Set the shoulders strong and lock in a long line from head to heel or knee. Brace the abs, breathe behind the brace, and hold or move without letting the hips sag.",
      tip: "Pull the ribs down gently so the low back stays quiet while the front of the trunk does the work.",
      couplet: "Ribs knit down and body stays long.\nHold the line and the middle grows strong."
    };
  }
  if(hasKeyword(title, ["dead bug", "bird dog"])){
    return {
      howTo: "Start with the spine neutral and the abs gently braced. Reach the opposite arm and leg away slowly, then return without letting the ribs flare or the lower back shift.",
      tip: "Only move as far as you can while keeping the trunk quiet and level.",
      couplet: "Reach out long, then draw it back.\nCalm in the center keeps you on track."
    };
  }
  if(hasKeyword(title, ["mountain climber"])){
    return {
      howTo: "Hold a strong plank and drive one knee toward the chest, then switch legs smoothly. Keep pressing the floor away as the feet trade places.",
      tip: "Go only as fast as you can keep the shoulders stacked and the hips from bouncing.",
      couplet: "Knees move quick but the trunk stays tight.\nFast feet below, calm frame in sight."
    };
  }
  if(hasKeyword(title, ["hollow", "v-up", "flutter", "reverse crunch", "toe touch", "bicycle"])){
    return {
      howTo: "Begin with the low back gently connected to the floor. Lift the legs and upper body as the variation asks, then lower with control without losing tension through the middle.",
      tip: "If the back pops up, shorten the range so you keep real abdominal work instead of chasing height.",
      couplet: "Ribs stay down and legs move light.\nControl the arc and keep it tight."
    };
  }
  return {
    howTo: "Set your trunk first, then let the limbs move around a stable center. Breathe steadily, keep the ribs controlled, and make each rep look deliberate rather than rushed.",
    tip: "The best core reps look almost quiet even when they feel demanding.",
    couplet: "Center held firm while the limbs all roam.\nKeep the middle braced and the body finds home."
  };
}
function buildMobilityInfo(ex){
  const title = ex.title.toLowerCase();
  if(hasKeyword(title, ["rotation", "open book", "thread the needle", "cat-cow"])){
    return {
      howTo: "Move slowly through the available range and let the breath help the motion. Rotate or flex and extend segment by segment instead of forcing the end position.",
      tip: "Exhale as you rotate or round to help the ribs soften and the movement open up.",
      couplet: "Breathe and turn, do not yank or shove.\nEasy range grows when the joints can move."
    };
  }
  if(hasKeyword(title, ["90/90", "hip", "adductor", "lunge", "ankle"])){
    return {
      howTo: "Set up in the shape, then shift slowly until you feel a clean stretch or opening through the hips, groin, or ankle. Pause, breathe, and move back out without bouncing.",
      tip: "Look for a smooth stretch sensation, not a pinchy joint feeling.",
      couplet: "Ease in slow and breathe right through.\nRange comes better when the move is true."
    };
  }
  if(hasKeyword(title, ["downward dog", "hamstring", "sweep", "reach"])){
    return {
      howTo: "Lengthen through the spine first, then reach the hips back to load the back of the body. Keep the knees as soft as needed so the stretch lands where you want it.",
      tip: "Chase long lines, not locked joints. A small knee bend often makes the position better.",
      couplet: "Reach back long and let tension go.\nSmooth lines first, then range will grow."
    };
  }
  return {
    howTo: "Move slowly through the pattern and spend a breath or two in the open position. Stay active rather than collapsing so the joints learn the shape with control.",
    tip: "Gentle pressure plus steady breathing usually opens range better than forcing depth.",
    couplet: "Slow and easy wins the day.\nOpen the range, do not wrench away."
  };
}
function buildPostureInfo(ex){
  const title = ex.title.toLowerCase();
  if(hasKeyword(title, ["angel", "snow angel", "swimmer", "raise"])){
    return {
      howTo: "Lift or sweep the arms with the neck relaxed and the upper back active. Think of reaching long through the fingertips while the shoulder blades glide down and back.",
      tip: "Make the motion smooth and honest. Do not crank the chin up just to get the arms higher.",
      couplet: "Arms reach long and shoulders stay low.\nUpper back leads and the posture will show."
    };
  }
  if(hasKeyword(title, ["chin tuck"])){
    return {
      howTo: "Stand or lie tall and gently draw the head straight back as if making a double chin. Hold for a beat, then release without tipping the head up or down.",
      tip: "Think back, not down. The neck should lengthen rather than jam.",
      couplet: "Head glides back and neck stays tall.\nSmall clean reps can fix a lot after all."
    };
  }
  if(hasKeyword(title, ["cobra", "retraction", "scap push"])){
    return {
      howTo: "Set the ribs and lengthen the spine, then use the upper back and shoulder blades to create the movement. Keep the effort centered between the shoulders instead of dumping into the low back.",
      tip: "Lead with the sternum gently, but stop before the lower back takes over.",
      couplet: "Chest lifts light and shoulders align.\nBack does the work and the posture looks fine."
    };
  }
  return {
    howTo: "Move with the ribcage stacked and the head long over the torso. Focus on clean shoulder-blade motion and light tension through the upper back.",
    tip: "Good posture drills should feel organized, not strained.",
    couplet: "Stack it tall and move with care.\nQuiet back work builds a steadier air."
  };
}
function buildCardioInfo(ex){
  const title = ex.title.toLowerCase();
  if(hasKeyword(title, ["jack", "seal jack"])){
    return {
      howTo: "Stay springy through the feet as the legs move out and in. Coordinate the arms with the step or hop pattern and keep the landings soft.",
      tip: "Think quiet feet and quick rhythm rather than stomping for intensity.",
      couplet: "Quick out, quick in, stay light below.\nSoft landings keep the rhythm flow."
    };
  }
  if(hasKeyword(title, ["high knees", "butt kicks", "march", "skip", "pogo"])){
    return {
      howTo: "Run or bounce in place with a tall torso and active arms. Lift or cycle the legs cleanly while staying light on the feet and breathing steadily.",
      tip: "Keep the steps underneath you so the drill stays fast and springy instead of heavy.",
      couplet: "Tall through the trunk and quick through the feet.\nLight on the floor keeps the pace neat."
    };
  }
  if(hasKeyword(title, ["boxing", "shuffle", "skater", "carioca", "fast feet"])){
    return {
      howTo: "Stay in an athletic stance with knees soft and the chest up. Move quickly side to side or in place while keeping the steps organized and the arms helping the rhythm.",
      tip: "Short, crisp steps are usually better than giant reaches that break your posture.",
      couplet: "Quick little steps and eyes ahead.\nMove with snap, not frantic tread."
    };
  }
  if(hasKeyword(title, ["burpee", "squat thrust"])){
    return {
      howTo: "Drop to the floor with control, jump or step the feet back, then return to standing smoothly. Keep the sequence tight so each rep flows without extra stalling.",
      tip: "Use a pace you can repeat cleanly rather than sprinting the first few reps and fading hard.",
      couplet: "Down to the floor, then up you fly.\nSmooth beats sloppy when the heart runs high."
    };
  }
  return {
    howTo: "Stay tall, breathe rhythmically, and keep the movement elastic through the feet and ankles. Let speed come from crisp mechanics instead of wild effort.",
    tip: "The best cardio drills look repeatable. Save a little room so the pace can last.",
    couplet: "Find the rhythm, hold the beat.\nFast but tidy wins on your feet."
  };
}
function buildBalanceInfo(ex){
  const title = ex.title.toLowerCase();
  if(hasKeyword(title, ["walk", "toe yoga"])){
    return {
      howTo: "Move slowly and deliberately, placing each foot with care before the weight fully transfers. Keep the torso tall and let the small stabilizers in the feet and hips do the work.",
      tip: "Fix the eyes on a steady point and let the breath stay easy.",
      couplet: "Eyes stay still and feet move small.\nQuiet control will steady all."
    };
  }
  if(hasKeyword(title, ["tree", "stand", "stork", "eyes-closed", "hold"])){
    return {
      howTo: "Stand tall on one leg and lightly brace the trunk. Let the standing foot grip the floor while the hip stays active and the free leg settles into the chosen shape.",
      tip: "A soft bend in the standing knee usually makes balance easier than locking the joint.",
      couplet: "Root through the foot and stand up high.\nStillness grows when you do not fight the sky."
    };
  }
  if(hasKeyword(title, ["reach", "hinge", "airplane", "tap"])){
    return {
      howTo: "Balance on the standing leg as the free leg or hands reach into space. Move slowly, keep the hips level when possible, and return to center before the wobble turns into a scramble.",
      tip: "Reach only as far as you can while the standing foot stays anchored.",
      couplet: "Reach away, then pull back in.\nOwn the edge and steadiness wins."
    };
  }
  return {
    howTo: "Set tall posture first, then challenge balance without rushing. Let the standing foot, ankle, and hip make the fine corrections while the torso stays calm.",
    tip: "Looking at one fixed point can clean up a lot of wobble right away.",
    couplet: "Stand with patience, small and strong.\nBalance gets better when you linger long."
  };
}
function getExerciseInfo(ex){
  const primary = formatList(ex.primary);
  const secondary = formatList(ex.secondary);
  const description = describeExerciseShape(ex);
  const familyInfo = ex.category === "push" ? buildPushInfo(ex)
    : ex.category === "legs" ? buildLegsInfo(ex)
    : ex.category === "core" ? buildCoreInfo(ex)
    : ex.category === "mobility" ? buildMobilityInfo(ex)
    : ex.category === "posture" ? buildPostureInfo(ex)
    : ex.category === "cardio" ? buildCardioInfo(ex)
    : buildBalanceInfo(ex);
  const generatedHowTo = `${description} ${familyInfo.howTo} This one mainly hits ${primary}${secondary ? `, with ${secondary} helping out.` : "."}`;
  return {
    howTo: ex.howTo || generatedHowTo,
    howToDetailed: ex.howToDetailed || generatedHowTo,
    tip: familyInfo.tip,
    couplet: familyInfo.couplet
  };
}
function bindPseudoButton(el, handler){
  el.addEventListener("click", handler);
  el.addEventListener("keydown", ev => {
    if(ev.key !== "Enter" && ev.key !== " ") return;
    handler(ev);
  });
}
function closeInfoPopup(){
  state.infoAnchor = null;
  els.infoPopup.classList.add("hidden");
  els.infoPopup.setAttribute("aria-hidden", "true");
}
function positionInfoPopup(anchorEl){
  if(!anchorEl || els.infoPopup.classList.contains("hidden")) return;
  const rect = anchorEl.getBoundingClientRect();
  const popupRect = els.infoPopup.getBoundingClientRect();
  const margin = 12;
  let left = rect.right + 10;
  let top = rect.top - 4;
  if(left + popupRect.width > window.innerWidth - margin){
    left = rect.left - popupRect.width - 10;
  }
  if(left < margin){
    left = Math.max(margin, Math.min(window.innerWidth - popupRect.width - margin, rect.left + (rect.width / 2) - (popupRect.width / 2)));
  }
  if(top + popupRect.height > window.innerHeight - margin){
    top = window.innerHeight - popupRect.height - margin;
  }
  if(top < margin){
    top = margin;
  }
  els.infoPopup.style.left = `${left}px`;
  els.infoPopup.style.top = `${top}px`;
}
function openInfoPopup(ex, anchorEl){
  const info = getExerciseInfo(ex);
  state.infoAnchor = anchorEl;
  els.infoPopupTitle.textContent = `${ex.title} note`;
  els.infoPopupHowTo.textContent = info.howTo;
  els.infoPopupTip.textContent = info.tip;
  els.infoPopupCouplet.innerHTML = info.couplet.replace("\n","<br>");
  els.infoPopup.classList.remove("hidden");
  els.infoPopup.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => positionInfoPopup(anchorEl));
}
function createCard(ex, {large=false, stampText="", footerHint="", removable=false, onRemove=null, addable=false, onAdd=null, showInfo=true} = {}){
  const card = document.createElement("div");
  card.className = `card${large ? " large" : ""}`;
  card.dataset.category = ex.category;
  card.innerHTML = `
    ${removable ? '<div class="card-remove-toggle" role="button" tabindex="0" aria-label="Remove from hand">X</div>' : ""}
    ${addable ? '<div class="card-add-toggle" role="button" tabindex="0" aria-label="Add to hand">↑</div>' : ""}
    ${showInfo ? '<div class="card-info-toggle" role="button" tabindex="0" aria-label="Show exercise note">?</div>' : ""}
    <div class="topband">
      <span class="topband-label">${CATEGORY_META[ex.category].label}</span>
    </div>
    <div class="body">
      <div class="name">${ex.title}</div>
      ${ex.icon ? `<div class="card-icon" aria-hidden="true">${ex.icon}</div>` : ""}
      <div class="muscle-groups">
        <div class="primary-muscles">${ex.primary.join(", ")}</div>
        <div class="secondary-muscles">${ex.secondary.join(", ")}</div>
      </div>
      <div class="footer-note">
        <div class="tiny">${footerHint || ex.category}</div>
      </div>
    </div>
  `;
  const removeToggle = card.querySelector(".card-remove-toggle");
  const addToggle = card.querySelector(".card-add-toggle");
  const toggle = card.querySelector(".card-info-toggle");
  function openPanel(ev){
    ev.preventDefault();
    ev.stopPropagation();
    if(!toggle) return;
    if(state.infoAnchor === toggle && !els.infoPopup.classList.contains("hidden")){
      closeInfoPopup();
      return;
    }
    openInfoPopup(ex, toggle);
  }
  if(removeToggle && onRemove){
    bindPseudoButton(removeToggle, ev => {
      ev.preventDefault();
      ev.stopPropagation();
      onRemove();
    });
    removeToggle.addEventListener("pointerdown", ev => ev.stopPropagation());
  }
  if(addToggle && onAdd){
    bindPseudoButton(addToggle, ev => {
      ev.preventDefault();
      ev.stopPropagation();
      onAdd();
    });
    addToggle.addEventListener("pointerdown", ev => ev.stopPropagation());
  }
  if(toggle){
    bindPseudoButton(toggle, openPanel);
    toggle.addEventListener("pointerdown", ev => ev.stopPropagation());
  }
  return card;
}
function renderFilters(){
  els.filterStrip.innerHTML = "";
  CATEGORY_ORDER.forEach(key => {
    const btn = document.createElement("button");
    btn.className = `filter-chip${state.category === key ? " active" : ""}`;
    btn.textContent = CATEGORY_META[key].label;
    btn.addEventListener("click", () => {
      state.category = key;
      pickVisibleBatch();
      renderFilters();
    });
    els.filterStrip.appendChild(btn);
  });
}
function renderLibrary(){
  const filtered = getFilteredExercises();
  const available = filtered.filter(ex => !state.deck.includes(ex.id));
  const visible = state.visibleIds
    .map(byId)
    .filter(Boolean)
    .filter(ex => available.some(f => f.id === ex.id));
  if(visible.length === 0 && available.length){
    state.visibleIds = sampleIds(available, 10);
  }
  const finalVisible = state.visibleIds.map(byId).filter(Boolean).filter(ex => available.some(f => f.id === ex.id));
  if(state.focusedLibraryId && !finalVisible.some(ex => ex.id === state.focusedLibraryId)){
    state.focusedLibraryId = null;
  }
  els.libraryMeta.textContent = `${finalVisible.length} visible · ${available.length} available · ${filtered.length} matching · ${EXERCISES.length} total`;
  els.libraryGrid.innerHTML = "";
  if(finalVisible.length === 0){
    const empty = document.createElement("div");
    empty.className = "note-box";
    empty.style.gridColumn = "1 / -1";
    empty.innerHTML = available.length === 0 && filtered.length
      ? "<strong>Everything matching is already in hand.</strong><br>Remove a card from the hand or broaden the search."
      : "<strong>No matches.</strong><br>Try a broader term or clear the search.";
    els.libraryGrid.appendChild(empty);
    return;
  }
  finalVisible.forEach(ex => {
    const wrap = document.createElement("div");
    wrap.className = "card-wrap";
    const btn = document.createElement("div");
    const isFocused = state.focusedLibraryId === ex.id;
    btn.className = `card-button${isFocused ? " is-focused" : ""}`;
    btn.setAttribute("role", "button");
    btn.tabIndex = 0;
    btn.title = isFocused ? "Library card focused" : "Focus card";
    btn.appendChild(createCard(ex, {
      stampText:"Add",
      footerHint: ex.primary[0] || ex.category,
      addable:isFocused,
      onAdd:() => addToDeck(ex.id),
      showInfo:isFocused
    }));
    btn.addEventListener("click", ev => {
      if(shouldSuppressClick()) return;
      if(ev.target.closest(".card-info-toggle,.card-add-toggle")) return;
      focusLibraryCard(ex.id);
    });
    btn.addEventListener("keydown", ev => {
      if(ev.target.closest(".card-info-toggle,.card-add-toggle")) return;
      if(ev.key !== "Enter" && ev.key !== " ") return;
      ev.preventDefault();
      focusLibraryCard(ex.id);
    });
    btn.addEventListener("pointerdown", ev => beginBuilderPointerDrag(ev, {type:"library", id:ex.id}, btn));
    wrap.appendChild(btn);
    els.libraryGrid.appendChild(wrap);
  });
}
function renderDeck(){
  if(state.focusedDeckId && !state.deck.includes(state.focusedDeckId)){
    state.focusedDeckId = null;
  }
  els.deckMetaChip.textContent = String(state.deck.length);
  els.handCountBubble.classList.remove("hidden");
  els.handCountBubble.style.setProperty("--fill", String(Math.max(0, Math.min(1, state.deck.length / MAX_DECK))));
  els.startWorkoutBtn.disabled = state.deck.length === 0;
  els.clearDeckBtn.disabled = state.deck.length === 0;
  renderHandBalance();
  els.deckSurface.innerHTML = "";
  if(!state.deck.length){
    const empty = document.createElement("div");
    empty.className = "deck-empty";
    empty.innerHTML = `<div class="deck-empty-copy">Drag cards from library</div>`;
    els.deckSurface.appendChild(empty);
    return;
  }
  const W = els.deckSurface.clientWidth || 640;
  const H = els.deckSurface.clientHeight || 310;
  const narrow = window.innerWidth < 640;
  const cardWidth = narrow ? 138 : 188;
  const cardHeight = narrow ? 200 : 272;
  const count = state.deck.length;
  const pad = 12;
  const previewScale = narrow ? 0.9 : 0.88;
  const previewWidth = Math.round(cardWidth * previewScale);
  const previewHeight = Math.round(cardHeight * previewScale);
  let xGap;
  if(narrow){
    const available = Math.max(40, W - previewWidth - pad * 2);
    const roomyMaxGap = 92, comfyGap = 48;
    const fitGap = count <= 1 ? 0 : available / Math.max(1, count - 1);
    xGap = count <= 1 ? 0 : Math.min(roomyMaxGap, Math.max(10, fitGap > comfyGap ? comfyGap : fitGap));
  } else {
    const overlapGap = Math.round(previewWidth * 0.9); // 10% overlap preferred
    const targetGap = count <= 1 ? 0 : (W * 0.95 - previewWidth) / Math.max(1, count - 1);
    xGap = count <= 1 ? 0 : Math.min(overlapGap, targetGap);
  }
  const rowWidth = previewWidth + xGap * Math.max(0, count - 1);
  const rowStart = count <= 1 ? Math.max(pad, Math.floor((W - previewWidth) / 2)) : Math.max(pad, Math.floor((W - rowWidth) / 2));
  const baseTop = Math.max(0, H - previewHeight + 20);
  state.deck.forEach((id, i) => {
    const ex = byId(id);
    const isFocused = state.focusedDeckId === id;
    const isBalanceHit = !!state.highlightedMuscle && getBalanceGroupsForExercise(ex).has(state.highlightedMuscle);
    const tilt = ((i % 5) - 2) * 0.65;
    const wobbleY = i % 3 === 1 ? 2 : 0;
    const holder = document.createElement("div");
    holder.className = `deck-card${isFocused ? " is-focused" : ""}${isBalanceHit ? " balance-hit" : ""}`;
    holder.setAttribute("role", "button");
    holder.tabIndex = 0;
    holder.dataset.deckIndex = String(i);
    holder.dataset.cardId = id;
    holder.title = "Remove from hand";
    holder.style.left = `${rowStart + i * xGap}px`;
    holder.style.top = `${baseTop + wobbleY - (isFocused ? 18 : 0)}px`;
    holder.style.transform = `rotate(${tilt}deg) scale(${previewScale})`;
    holder.style.zIndex = String(isFocused ? 1000 : i + 1);
    holder.appendChild(createCard(ex, {
      large: !narrow,
      stampText:"In hand",
      footerHint:ex.primary[0] || ex.category,
      removable:true,
      onRemove:() => removeFromDeck(id)
    }));
    holder.addEventListener("click", ev => {
      if(shouldSuppressClick()) return;
      if(ev.target.closest(".card-info-toggle,.card-remove-toggle")) return;
      focusDeckCard(id);
    });
    holder.addEventListener("keydown", ev => {
      if(ev.target.closest(".card-info-toggle,.card-remove-toggle")) return;
      if(ev.key !== "Enter" && ev.key !== " ") return;
      ev.preventDefault();
      focusDeckCard(id);
    });
    holder.addEventListener("pointerdown", ev => beginBuilderPointerDrag(ev, {type:"deck", id, index:i}, holder));
    els.deckSurface.appendChild(holder);
  });
}
function renderHandBalance(){
  const scores = getBalanceGroupScores(state.deck);
  const coveredCount = BALANCE_GROUPS.filter(label => (scores[label] || 0) > 0).length;
  if(state.highlightedMuscle && !BALANCE_GROUPS.includes(state.highlightedMuscle)){
    state.highlightedMuscle = null;
  }
  els.handBalanceMeta.textContent = `${coveredCount} / ${BALANCE_GROUPS.length} covered`;
  els.handBalanceList.innerHTML = "";
  if(!BALANCE_GROUPS.length){
    els.handBalanceList.innerHTML = `<div class="balance-empty"><strong>No coverage yet.</strong><br>Add cards to see which muscles this hand leans toward.</div>`;
    return;
  }
  const max = Math.max(1, ...BALANCE_GROUPS.map(label => scores[label] || 0));
  BALANCE_GROUPS.forEach(label => {
    const value = scores[label] || 0;
    const row = document.createElement("div");
    row.className = `balance-mini-row${state.highlightedMuscle === label ? " balance-active" : ""}`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "balance-mini-btn";
    btn.setAttribute("aria-pressed", state.highlightedMuscle === label ? "true" : "false");
    const displayLabel = CATEGORY_META[label].label;
    btn.title = state.highlightedMuscle === label ? `Clear ${displayLabel} highlight` : `Highlight ${displayLabel} cards`;
    btn.innerHTML = `
      <div class="balance-mini-head">
        <span>${displayLabel}</span>
        <span class="mono">${value % 1 === 0 ? value : value.toFixed(1)}</span>
      </div>
      <div class="balance-mini-track">
        <div class="balance-mini-fill" style="width:${value > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0}%"></div>
      </div>
    `;
    btn.addEventListener("click", () => toggleHighlightedMuscle(label));
    row.appendChild(btn);
    els.handBalanceList.appendChild(row);
  });
}
function drawRandomDeck(count = 7){
  state.deck = sampleIds(EXERCISES, Math.max(1, Math.min(MAX_DECK, count)));
  renderDeck();
  renderLibrary();
}
function drawOneCard(){
  if(state.deck.length >= MAX_DECK) return;
  const available = EXERCISES.filter(ex => !state.deck.includes(ex.id));
  if(!available.length) return;
  const [picked] = sampleIds(available, 1);
  state.deck = [...state.deck, picked];
  renderDeck();
  renderLibrary();
}
function currentExercise(){
  return byId(state.workoutDeck[state.currentIndex]);
}
function renderMiniPile(container, ids, {done=false} = {}){
  container.innerHTML = "";
  ids.slice(0, 6).forEach((id, i) => {
    const ex = byId(id);
    const card = createCard(ex, {stampText: done ? "Done" : "Live"});
    const mini = document.createElement("div");
    mini.className = "mini-card";
    mini.style.left = `${6 + i * 10}px`;
    mini.style.top = `${8 + i * 10}px`;
    mini.style.transform = `rotate(${(-4 + i * 2)}deg)`;
    mini.appendChild(card);
    container.appendChild(mini);
  });
}
function updateProgressRing(){
  if(!els.progressRingFill || !state.workoutDeck.length) return;
  const progress = state.currentIndex / state.workoutDeck.length;
  els.progressRingFill.style.strokeDashoffset = 452 * (1 - progress);
}

function renderWorkout(){
  const current = currentExercise();
  if(!current){
    showSummary();
    return;
  }
  const currentSecs = state.workoutTimes[state.currentIndex] || 0;
  const beforeSecs = state.workoutTimes.slice(0, state.currentIndex).reduce((a,b)=>a+b,0);
  const totalSecs = totalElapsed();
  els.exerciseTimer.textContent = formatTime(currentSecs);
  els.totalTimerLine.textContent = `${formatTime(beforeSecs)} + ${formatTime(currentSecs)} = ${formatTime(totalSecs)}`;
  els.cardPosition.textContent = `Card ${state.currentIndex + 1} / ${state.workoutDeck.length}`;
  els.windowFrame.classList.toggle("is-paused-tone", !state.running);
  els.pauseBtn.setAttribute("aria-pressed", state.running ? "true" : "false");
  els.pauseBtn.classList.toggle("is-running", state.running);
  els.pauseBtn.classList.toggle("is-paused", !state.running);
  els.autoToggleBtn.textContent = state.autoEnabled ? "Auto on" : "Auto off";
  els.autoToggleBtn.classList.toggle("is-on", state.autoEnabled);
  const autoRemaining = Math.max(0, currentAutoTargetSecs() - currentSecs);
  els.autoCountdown.textContent = state.autoEnabled ? formatTime(autoRemaining) : formatTime(state.autoDefaultSecs);
  [[els.auto1Btn, 60], [els.auto2Btn, 120], [els.auto3Btn, 180]].forEach(([btn, secs]) => {
    btn.classList.toggle("active", state.autoDefaultSecs === secs);
  });
  els.autoAdd30Btn.disabled = !state.autoEnabled;
  els.autoMeta.textContent = state.autoEnabled
    ? `Default ${formatTime(state.autoDefaultSecs)} · This card ${formatTime(currentAutoTargetSecs())}`
    : `Default ${formatTime(state.autoDefaultSecs)} · Auto is off`;
  const info = getExerciseInfo(current);
  if(state.activeFunFactCardId !== current.id){
    const funFacts = Array.isArray(current.funFacts) ? current.funFacts.filter(Boolean) : [];
    state.activeFunFactCardId = current.id;
    if(funFacts.length){
      state.activeFunFactText = funFacts[Math.floor(Math.random() * funFacts.length)];
      els.activeFunFactLabel.textContent = "Fun fact";
    } else {
      state.activeFunFactText = "";
      els.activeFunFactLabel.textContent = "Fun fact";
    }
  }
  els.activeFunFactWrap.classList.toggle("hidden", !state.activeFunFactText);
  els.activeFunFact.textContent = state.activeFunFactText;
  els.activeHowTo.textContent = info.howTo;
  els.activeTip.textContent = info.tip;
  els.activeCardSlot.innerHTML = "";
  els.activeCardSlot.appendChild(createCard(current, {large:true, stampText:"Live", footerHint: current.primary[0] || current.category}));

  const doneIds = state.workoutDeck.filter((id, index) => state.completed.has(index));
  const remainingIds = state.workoutDeck.filter((id, index) => index > state.currentIndex && !state.completed.has(index));

  renderMiniPile(els.donePile, doneIds, {done:true});
  renderMiniPile(els.remainingPile, remainingIds);
  els.remainingMeta.textContent = `${Math.max(0, state.workoutDeck.length - state.currentIndex - 1)} cards left`;
  els.doneMeta.textContent = `${doneIds.length} done`;
  els.remainingList.innerHTML = remainingIds.length
    ? remainingIds.slice(0,5).map((id, i) => `${i+1}. ${byId(id).title}`).join("<br>")
    : "No cards left after this one.";
  els.doneList.innerHTML = doneIds.length
    ? doneIds.slice(-5).map((id, i) => `${i+1}. ${byId(id).title}`).join("<br>")
    : "Nothing done yet.";
  updateProgressRing();
}

function tick(){
  if(!state.running || state.autoAdvancePending) return;
  state.workoutTimes[state.currentIndex] = (state.workoutTimes[state.currentIndex] || 0) + 1;
  if(state.autoEnabled && state.workoutTimes[state.currentIndex] >= currentAutoTargetSecs()){
    playAutoChime();
    state.autoAdvancePending = true;
    renderWorkout();
    state.autoAdvanceTimeout = setTimeout(() => {
      state.autoAdvanceTimeout = null;
      state.autoAdvancePending = false;
      doneCurrent();
    }, 450);
    return;
  }
  renderWorkout();
}
function startWorkout(){
  if(!state.deck.length) return;
  clearAutoAdvancePending();
  state.workoutDeck = shuffle([...state.deck]);
  state.workoutTimes = new Array(state.workoutDeck.length).fill(0);
  state.autoBaseSecs = new Array(state.workoutDeck.length).fill(0);
  state.autoExtraSecs = new Array(state.workoutDeck.length).fill(0);
  state.currentIndex = 0;
  state.completed = new Set();
  state.activeFunFactCardId = null;
  state.activeFunFactText = "";
  state.running = true;
  if(state.interval) clearInterval(state.interval);
  state.interval = setInterval(tick, 1000);
  setScreen("workoutScreen");
  renderWorkout();
}
function moveToNext(){
  clearAutoAdvancePending();
  if(state.currentIndex >= state.workoutDeck.length - 1){
    showSummary();
    return;
  }
  state.currentIndex += 1;
  renderWorkout();
}
function doneCurrent(){
  clearAutoAdvancePending();
  state.completed.add(state.currentIndex);
  moveToNext();
}
function showSummary(){
  clearAutoAdvancePending();
  state.running = false;
  if(state.interval) clearInterval(state.interval);
  setScreen("summaryScreen");
  renderSummary();
}
function renderSummary(){
  const completedIds = state.workoutDeck.filter((id, idx) => state.completed.has(idx));
  const scores = getMuscleScores(completedIds);
  const sorted = Object.entries(scores).sort((a,b) => b[1] - a[1]);
  const max = sorted.length ? sorted[0][1] : 1;
  els.summaryTime.textContent = formatTime(totalElapsed());
  els.summaryCompleted.textContent = String(state.completed.size);
  els.summaryExerciseList.innerHTML = "";
  els.barList.innerHTML = "";
  if(!sorted.length){
    els.barList.innerHTML = `<div class="note-box"><strong>No completed cards yet.</strong><br>Mark some cards Done to build a muscle summary.</div>`;
  } else {
    sorted.slice(0, 10).forEach(([muscle, score]) => {
      const row = document.createElement("div");
      row.className = "bar-row";
      const pct = Math.max(10, (score / max) * 100);
      row.innerHTML = `
        <div class="bar-head"><span>${muscle}</span><span>${score.toFixed(score % 1 ? 1 : 0)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      `;
      els.barList.appendChild(row);
    });
  }
  if(!completedIds.length){
    els.summaryExerciseList.innerHTML = `<div class="summary-exercise-empty"><strong>No exercises completed yet.</strong><br>Finish at least one card to build a done list.</div>`;
  } else {
    completedIds.forEach((id, index) => {
      const ex = byId(id);
      const item = document.createElement("div");
      item.className = "summary-exercise-item";
      item.innerHTML = `
        <div class="summary-exercise-head">
          <span>Done ${index + 1}</span>
          <span>${CATEGORY_META[ex.category].label}</span>
        </div>
        <div class="summary-exercise-title">${ex.title}</div>
      `;
      els.summaryExerciseList.appendChild(item);
    });
  }
  els.summaryFan.innerHTML = "";
  const fanWidth = els.summaryFan.clientWidth || 640;
  const fanCardWidth = 150;
  const fanCount = state.workoutDeck.length;
  const fanStep = fanCount <= 1 ? 0 : Math.max(8, Math.min(18, (fanWidth - fanCardWidth - 12) / (fanCount - 1)));
  const fanSpread = fanCardWidth + fanStep * Math.max(0, fanCount - 1);
  const fanStart = Math.max(0, Math.floor((fanWidth - fanSpread) / 2));
  state.workoutDeck.forEach((id, i) => {
    const ex = byId(id);
    const wrap = document.createElement("div");
    wrap.style.position = "absolute";
    wrap.style.left = `${fanStart + i * fanStep}px`;
    wrap.style.bottom = "0";
    wrap.style.transform = `rotate(${(-16 + i * 3)}deg)`;
    wrap.appendChild(createCard(ex, {stampText: state.completed.has(i) ? "Done" : "Live"}));
    els.summaryFan.appendChild(wrap);
  });

  const topWorked = sorted.slice(0,3).map(([m]) => m);
  els.mostWorkedCard.innerHTML = `<strong>Most worked today:</strong><br>${topWorked.length ? topWorked.join(", ") : "Nothing scored yet."}`;
}
function bindEvents(){
  bindPseudoButton(els.infoPopupHide, ev => {
    ev.preventDefault();
    ev.stopPropagation();
    closeInfoPopup();
  });
  els.infoPopup.addEventListener("pointerdown", ev => ev.stopPropagation());
  document.addEventListener("click", ev => {
    if(els.infoPopup.classList.contains("hidden")) return;
    if(ev.target.closest(".card-info-toggle") || ev.target.closest("#infoPopup")) return;
    closeInfoPopup();
  });
  document.addEventListener("pointerdown", ev => {
    if(ev.target.closest(".card-button")) return;
    if(state.focusedLibraryId !== null){
      state.focusedLibraryId = null;
      renderLibrary();
    }
    if(ev.target.closest(".deck-card")) return;
    if(state.focusedDeckId !== null){
      state.focusedDeckId = null;
      renderDeck();
    }
  });
  els.balancePopupBtn.addEventListener("click", ev => {
    ev.stopPropagation();
    els.handBalanceDock.classList.toggle("balance-open");
  });
  document.addEventListener("click", ev => {
    if(els.handBalanceDock.classList.contains("balance-open") &&
       !els.handBalanceDock.contains(ev.target) &&
       ev.target !== els.balancePopupBtn){
      els.handBalanceDock.classList.remove("balance-open");
    }
  });
  els.drawSevenBtn.addEventListener("click", () => drawRandomDeck(7));
  els.drawOneBtn.addEventListener("click", drawOneCard);
  els.clearDeckBtn.addEventListener("click", () => {
    state.deck = [];
    renderDeck();
    renderLibrary();
  });
  els.startWorkoutBtn.addEventListener("click", startWorkout);
  els.searchInput.addEventListener("input", e => {
    state.search = e.target.value;
    pickVisibleBatch();
  });
  els.differentTenBtn.addEventListener("click", pickVisibleBatch);

  els.pauseBtn.addEventListener("click", () => {
    clearAutoAdvancePending();
    state.running = !state.running;
    renderWorkout();
  });
  els.autoToggleBtn.addEventListener("click", () => {
    if(!state.autoEnabled){
      state.autoBaseSecs[state.currentIndex] = state.workoutTimes[state.currentIndex] || 0;
    }
    state.autoEnabled = !state.autoEnabled;
    renderWorkout();
  });
  [[els.auto1Btn, 60], [els.auto2Btn, 120], [els.auto3Btn, 180]].forEach(([btn, secs]) => {
    btn.addEventListener("click", () => {
      state.autoDefaultSecs = secs;
      state.autoExtraSecs[state.currentIndex] = 0;
      renderWorkout();
    });
  });
  els.autoAdd30Btn.addEventListener("click", () => {
    state.autoExtraSecs[state.currentIndex] = (state.autoExtraSecs[state.currentIndex] || 0) + 30;
    renderWorkout();
  });
  els.doneBtn.addEventListener("click", doneCurrent);
  els.finishBtn.addEventListener("click", showSummary);
  els.backToBuilderBtn.addEventListener("click", () => {
    setScreen("builderScreen");
  });
  els.homeBtn.addEventListener("click", () => {
    clearAutoAdvancePending();
    state.running = false;
    if(state.interval) clearInterval(state.interval);
    closeInfoPopup();
    setScreen("builderScreen");
  });
  window.addEventListener("resize", () => {
    syncResponsiveWorkoutTimer();
    positionInfoPopup(state.infoAnchor);
    renderDeck();
    renderLibrary();
  });
  window.addEventListener("keydown", ev => {
    if(ev.key === "Escape") closeInfoPopup();
    if(ev.key === "Escape" && state.focusedLibraryId !== null){
      state.focusedLibraryId = null;
      renderLibrary();
    }
  });
}
function init(){
  syncResponsiveWorkoutTimer();
  renderFilters();
  populateSuggestions();
  pickVisibleBatch();
  renderDeck();
  bindEvents();
}
init();
