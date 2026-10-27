# Story playbook: one question, a chain of clues, a payoff

Read this in Phase 1, before writing any narration. A case-file video is not a list of facts with nice paper. It is **one story**: a question the viewer wants answered, a conflict that makes the answer non-obvious, clues that move toward it, and a payoff.

## 1. Find the central question and its conflict
- **Central question.** The whole video answers one question. A topic ("black holes") is not a question. A question with tension is: "What would you actually see falling into a black hole?"
- **Conflict.** The gap between what the viewer expects and what is true. Find it during research: the counter-intuitive fact, the two observers who disagree, the thing everyone gets wrong.
- **ABT logline.** Write it as *And, But, Therefore* (Randy Olson's narrative template):
  `[setup] AND [what we know], BUT [the contradiction], THEREFORE [what we'll find out].`
  Example: "Black holes swallow light AND nothing comes back out, BUT a friend watching you fall would see you freeze at the edge forever, THEREFORE what really happens to *you*?"
  If you can't write the BUT, you have a topic, not a story yet. Keep researching.
- **Why it works.** Curiosity is strongest when people notice a specific gap in what they know (Loewenstein's information-gap theory). The central question opens that gap, and the video closes it.

## 2. The hook: the first second
Write **three hook options**, each pulling a different lever, then pick the strongest:

| Lever | Shape | Black-hole example |
|---|---|---|
| Suspense | a question the viewer can't answer yet | "What would you actually see falling into a black hole?" |
| Surprise | a fact that breaks an expectation | "To everyone watching, you'd never hit the bottom." |
| Emotion | awe, fear, or *you* at stake | "Here's what your last seconds near a black hole look like." |

Test each option. Keep the one that passes all four:
1. **Muted test.** The first frame plus its on-screen text alone make you want the answer.
2. **Gap test.** The viewer can't answer it yet, but cares about the answer.
3. **Spine test.** It is the central question, or its sharpest form, so the payoff answers it.
4. **Truth test.** It survives the accuracy pass. A hook that overpromises loses trust at the payoff.

Rules for the first second:
- The **first frame** is the hero visual plus the question as text (`B.question` at `'@0'`). No intro card, no logo, no "Case file #00N", no slow fade-in.
- The **first spoken words** are the hook: 12 words or fewer, finished by about 3 seconds.
- Engine recipe: scene 1 uses `layout: 'full', head: false, transition: 'smash'`.

## 3. The body: a chain of clues, not a list
- **One beat per scene.** Each scene answers part of the question *and raises the next one* ("…but then why does the light fade?").
- **Connect with BUT / SO / THEREFORE, not AND THEN.** Read only the first words of each scene's narration in order. They should sound like "But… / So… / That's why… / Here's the strange part…", not "Also… / Next… / Another fact…".
- **Hold the big answer, pay small ones.** Keep the central answer for the verdict. Pay off small clues along the way so viewers feel progress.
- **The proof scene.** One scene shows the idea solving something: a famous puzzle, a real case, a "that's why…". It is often the best full-screen moment.
- **Cut test.** If removing a scene doesn't break the story, cut it.

## 4. Pictures that push the story forward
- **The hero changes state.** In every scene the hero visual *does* the point: splits, fills up, gets crossed out, freezes, stretches, lights up. Write it as a verb in the plan table's `visual change` column. A label sitting next to a picture is not a visual change.
- **Something new every 1–2 seconds:** a clipping lands, a piece moves, the camera punches in, a stamp slams, a transition. No static hold longer than 2 s unless the pause is the beat (`motion.js` flags it as dead air).
- **Show it as it's said.** Cue the hero action on the key word of the narration, never before it and never long after.
- **Vary the frame** (see the SKILL.md variety rules): full-screen moments, different transitions, camera moves.

## 5. Talk like a person
- **Talk to one viewer.** Use "you", contractions, short sentences, and the odd rhetorical question.
- **No lecture voice.** Never write "In this video we will…" or "Let's explore…". Start in the middle of the story.
- **Read it aloud.** If a sentence needs a breath in the middle, split it. Put commas and `...` where the voice should pause, because they also drive the caption timing.

## 6. The close: answer, twist, conversation
1. **Verdict.** Answer the central question in plain words, as a callback to the hook's words or image ("So what would you see? …"). "Case closed" belongs here.
2. **Twist / one last clue.** One more surprising, true fact that makes the answer bigger.
3. **Comment question.** A question tied to the central question that people can answer in a word or a sentence ("Would you jump in?"). Show it big with `B.question` as the last frame, and put it on the end card too.
4. Optional: end on an image that flows back into the first frame, so a replay feels seamless.

## 7. Plan table and self-check
Plan table columns: `#`, `beat` (hook / clue / proof / verdict / payoff), `question raised → answered`, `kicker`, `title`, `narration`, `visual change` (verb), `layout`, `transition`, `effects`, `certainty`, `assets needed (+ fallback)`, `sound accents`.

Before the storyboard, check:
- [ ] One central question, stated in the hook and answered in the verdict.
- [ ] The ABT logline has a real BUT.
- [ ] Three hooks were written and the winner passes all four tests.
- [ ] Every scene raises or answers a question, and the first words chain with but / so / therefore.
- [ ] Every scene has a visual-change verb, and something changes every 1–2 s.
- [ ] Narration sounds like talking, not reading, and has no lecture openers.
- [ ] The close answers, twists, then asks.
- [ ] The accuracy pass is done: point of view named, speculation framed as speculation.

## Where these rules come from
- **TikTok's Creative Codes** split a video into Hook, Body and Close, and say the first seconds carry most of the impact. They report suspense, surprise and emotion as the strongest hook levers, and fast scene changes and text pop-ups as attention drivers. These figures come from TikTok *ads* research, so treat them as direction, not a guarantee for organic videos. https://ads.tiktok.com/business/library/Creative_Codes_ENG.pdf
- **YouTube's Shorts advice** to creators is to open strong and use the first few seconds to make viewers stay. Its "viewed vs. swiped away" analytics measure exactly that drop-off.
- **OpusClip's 2026 storyline research** (about 14,600 clips, AI-labelled, from OpusClip users) found "Expert Explainer" the most common storyline (about 17%) and conversational delivery the most common style. These are counts of what is common, not proof of what performs. https://www.opus.pro/research/best-storyline-patterns-tiktok
- **Loewenstein, "The Psychology of Curiosity" (1994):** the information-gap theory of curiosity.
- **Randy Olson, the ABT (And, But, Therefore) framework** for science storytelling.
- The "one central question" structure, the clue chain and the comment-question close are this skill's own creative choices built on those ideas.
