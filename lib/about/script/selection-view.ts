/*
  Shows a selection on the page: the roles it concerns stay at full strength in Experience and on the ruler while the
  rest dim. A pressed skill's chip shows pressed, with a line under its group naming the roles and a label over the
  ruler naming the skill. A role lights the chips it used and puts its name and months over its bar.
*/
import { roleDatesInWords } from "@/lib/about/role-dates";
import { skillAnswer, type AnswerPiece } from "@/lib/about/skill-answer";
import type { PageParts, RoleOnPage, RulerBarOnPage } from "./page-parts";
import type { Subject } from "./selection";

const LIT = "is-lit";
const ANSWERING = "is-answering";

function rolesConcerned(subject: Subject | undefined, roles: RoleOnPage[]) {
  if (!subject) return [];
  if (subject.kind === "role")
    return roles.filter((role) => role.key === subject.role);
  return roles.filter((role) => role.skills.includes(subject.skill));
}

/** A chip's group keeps one line for its answer, empty until one of its chips is pressed. */
function answerLineFor(chip: HTMLButtonElement) {
  const group = chip.closest("dd");
  if (!group) return undefined;
  let line = group.querySelector<HTMLElement>(".chips-answer");
  if (!line) {
    line = document.createElement("p");
    line.className = "chips-answer";
    line.setAttribute("aria-live", "polite");
    group.append(line);
  }
  return line;
}

function writeAnswer(line: HTMLElement, pieces: AnswerPiece[]) {
  line.replaceChildren(
    ...pieces.map((piece) => {
      if ("text" in piece) return document.createTextNode(piece.text);
      const link = document.createElement("a");
      link.href = piece.role.anchor;
      link.textContent = piece.role.shortName;
      return link;
    }),
  );
}

/** Where the label sits over a bar: from its start near the ruler's left end, to its end near the right, else centred. */
function placeLabel(label: HTMLElement, bar: RulerBarOnPage) {
  const left = parseFloat(bar.item.style.left);
  const width = parseFloat(bar.item.style.width);
  const middle = left + width / 2;
  const edge = middle < 25 ? "start" : middle > 75 ? "end" : "middle";
  label.dataset.edge = edge;
  label.style.left =
    edge === "start" ? `${left}%` : edge === "end" ? "" : `${middle}%`;
  label.style.right = edge === "end" ? `${100 - left - width}%` : "";
}

function placeLabelAtStart(label: HTMLElement) {
  label.dataset.edge = "start";
  label.style.left = "0%";
  label.style.right = "";
}

export function createSelectionView(parts: PageParts) {
  const answerLines = new Map(
    parts.chips.map((chip) => [chip, answerLineFor(chip)] as const),
  );
  const rulerLabel = document.createElement("p");
  rulerLabel.className = "ruler-label";
  rulerLabel.setAttribute("aria-hidden", "true");
  parts.ruler?.prepend(rulerLabel);

  function showRoles(shown: Subject | undefined) {
    const concerned = new Set(
      rolesConcerned(shown, parts.roles).map((role) => role.key),
    );
    parts.experience?.classList.toggle(ANSWERING, !!shown);
    parts.ruler?.classList.toggle(ANSWERING, !!shown);
    for (const role of parts.roles)
      role.entry.classList.toggle(LIT, concerned.has(role.key));
    for (const bar of parts.rulerBars)
      bar.item.classList.toggle(LIT, concerned.has(bar.key));
  }

  function showChips(shown: Subject | undefined, pinned: Subject | undefined) {
    const role =
      shown?.kind === "role"
        ? parts.roles.find((each) => each.key === shown.role)
        : undefined;
    const pressedSkill = pinned?.kind === "skill" ? pinned.skill : undefined;
    for (const chip of parts.chips) {
      const skill = chip.dataset.skill ?? "";
      chip.setAttribute("aria-pressed", String(skill === pressedSkill));
      chip.classList.toggle(LIT, !!role?.skills.includes(skill));
    }
    const pressedChip = parts.chips.find(
      (chip) => chip.dataset.skill === pressedSkill,
    );
    const pressedLine = pressedChip && answerLines.get(pressedChip);
    for (const line of new Set(answerLines.values())) {
      if (!line) continue;
      const answers = line === pressedLine ? pressedSkill : undefined;
      // Written only when it changes, so a screen reader hears each answer once.
      if (line.dataset.answers === answers) continue;
      if (answers)
        writeAnswer(line, skillAnswer(rolesConcerned(pinned, parts.roles)));
      else line.replaceChildren();
      if (answers) line.dataset.answers = answers;
      else delete line.dataset.answers;
    }
  }

  /** Over a role's bar, its name and months. For a pressed skill, at the ruler's start, what the lit bars are. */
  function showRulerLabel(shown: Subject | undefined) {
    if (shown?.kind === "skill") {
      rulerLabel.textContent = `Roles that used ${shown.skill}`;
      placeLabelAtStart(rulerLabel);
      return;
    }
    const role =
      shown?.kind === "role"
        ? parts.roles.find((each) => each.key === shown.role)
        : undefined;
    const bar = role && parts.rulerBars.find((each) => each.key === role.key);
    if (!role || !bar) {
      rulerLabel.textContent = "";
      return;
    }
    rulerLabel.textContent = `${role.shortName}, ${roleDatesInWords(role)}`;
    placeLabel(rulerLabel, bar);
  }

  return (shown: Subject | undefined, pinned: Subject | undefined) => {
    showRoles(shown);
    showChips(shown, pinned);
    showRulerLabel(shown);
  };
}
