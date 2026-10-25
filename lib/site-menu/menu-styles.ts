/*
  How the menu looks: a small panel of the page's own paper, ink and face (MenuLook, set on the menu's host as
  --menu-panel, --menu-ink, --menu-muted, --menu-rule and --menu-face), a hairline edge and a quiet shadow. It lives in
  a shadow root, so no rule of the page reaches it, and the page's tokens still do, as custom properties inherit.
  The item under the pointer or the keys is tinted with the ink; a chevron marks an item with a submenu.
*/
export const MENU_STYLES = `
.panel {
  position: fixed;
  box-sizing: border-box;
  min-width: 176px;
  max-width: min(360px, calc(100vw - 16px));
  max-height: calc(100vh - 16px);
  overflow-y: auto;
  overscroll-behavior: contain;
  margin: 0;
  padding: 4px;
  border: 1px solid var(--menu-rule, GrayText);
  border-radius: 10px;
  background: var(--menu-panel, Canvas);
  color: var(--menu-ink, CanvasText);
  box-shadow:
    0 14px 32px -14px rgb(0 0 0 / 0.5),
    0 2px 6px -2px rgb(0 0 0 / 0.18);
  font: 500 14px/20px var(--menu-face, system-ui, sans-serif);
  letter-spacing: normal;
  word-spacing: normal;
  text-transform: none;
  text-shadow: none;
  text-align: start;
  white-space: nowrap;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
  -webkit-font-smoothing: antialiased;
}
@media (prefers-reduced-motion: no-preference) {
  .panel {
    animation: appear 90ms ease-out;
  }
}
@keyframes appear {
  from {
    opacity: 0;
  }
}
.item {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  width: 100%;
  margin: 0;
  padding: 6px 8px 6px 10px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
  text-decoration: none;
  cursor: default;
  outline: none;
  appearance: none;
  -webkit-tap-highlight-color: transparent;
}
.item:focus,
.item[aria-expanded="true"] {
  background: var(--menu-rule, Highlight);
  background: color-mix(in oklab, var(--menu-ink, CanvasText) 9%, var(--menu-panel, Canvas));
}
.label {
  overflow: hidden;
  text-overflow: ellipsis;
}
.chevron {
  flex: none;
  width: 14px;
  height: 14px;
  color: var(--menu-muted, GrayText);
}
.separator {
  height: 1px;
  margin: 4px 6px;
  background: var(--menu-rule, GrayText);
}
`;

/** The chevron that marks an item with a submenu. Drawn, not a character: a post's own fonts may not hold one. */
export const CHEVRON = `<svg class="chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
