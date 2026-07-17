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

The **Connect Folder** and **Download JSON** options remain available for local backups. Saving locally does not sync the library to other machines.
