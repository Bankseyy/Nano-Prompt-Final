# Nano Prompt Final

The prompt library is stored in `presets.json`. The editor in `index.html` reads that file directly from GitHub so every browser sees the same saved prompts.

## First-time GitHub connection

1. Open the studio and select **Edit → Connect GitHub**.
2. Follow the link to create a fine-grained personal access token.
3. Under **Repository access**, choose **Only select repositories** and select `Nano-Prompt-Final`.
4. Under **Repository permissions**, give **Contents** read and write access. No other write permission is needed.
5. Paste the token into the studio. Leave **Remember on this device** off on a shared machine.

Tokens are kept only in browser session storage by default, or in that browser's local storage when **Remember on this device** is selected. They are never written to the repository.

## Everyday workflow

1. Open the studio. It loads the latest `presets.json` from the `main` branch.
2. Add or edit prompts.
3. Select **Save to GitHub**. This creates a commit on `main` and makes the prompts available to other machines immediately.

If another browser has changed `presets.json` since the current edit began, the studio blocks the save instead of overwriting it. Use **Download JSON** as a backup, reload the repository version, and reapply the change.

Use **Download JSON** in **Edit template** for local backups. Downloading a backup does not sync the library to other machines.


## Redesigned workspace

- Browse categories in the sidebar, or search across template names, categories and prompt text.
- Use **Build prompt** to fill variables and see the rendered output beside them.
- Use **Edit template** for library changes, reference-image uploads, JSON backups and GitHub sync.
- Use **Copy prompt** or **Ctrl/Cmd + Enter** to copy the current output. Unfilled variables remain in square brackets.

## Temporary prompts

Select **Temporary prompt**, paste a prompt containing variables such as `[subject]`, `[style]` and `[lighting]`, then fill the detected fields. Repeated variable names share one value. Names are trimmed, so `[subject]` and `[ subject ]` use the same field.

The temporary prompt and its values stay only in page memory. They survive switching back to the library, but are cleared on page reload or closure. They are only added to saved templates when you explicitly choose **Save as template**. Otherwise they are excluded from JSON exports, GitHub saves and stored library values. **Reset values** empties variable fields; **Clear scratchpad** removes the temporary source and values after confirmation.

## Local development

This is a buildless static app. Serve this directory with a static HTTP server, for example `python -m http.server 8765`, and open `http://localhost:8765`.

Run `npm ci` followed by `npm test` for DOM interaction checks covering temporary-prompt isolation, repeated variables, reset, mode switching, library search, template edits, export isolation and clipboard feedback. These checks do not replace visual browser testing or a live GitHub write test.

### Save a temporary prompt as a template

Choose **Save as template** in the scratchpad, enter a name and category, then select **Add to library**. The new template keeps the original bracket variables and carries over your current field values. The editor opens with the new template selected; choose **Save to GitHub** to persist it across devices and reloads. Existing templates and the scratchpad source are preserved. Cancel closes the dialog without changing the library.

### Find and replace in temporary prompts

Expand **Find and replace** below the temporary source. Enter literal text to find, then a replacement; leave the replacement empty to remove matches. **Replace first** changes the first occurrence and **Replace all** changes every occurrence. Search ignores case unless **Match case** is checked. The match count updates as you type. Replacements refresh variable fields and live output without changing saved templates. For example, replace `a fox` with `[subject]` to create a reusable variable.
