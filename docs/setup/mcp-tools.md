# MCP Tools Setup

This project is prepared for Superpowers as a Codex plugin/skill pack and Stitch as an MCP server:

- Superpowers plugin
- Stitch MCP

## Installed Components

| Tool | Location | Status |
|------|----------|--------|
| Superpowers plugin repository | `/Users/alfonsofocareta/.codex/superpowers` | Installed |
| Superpowers skills symlink | `/Users/alfonsofocareta/.agents/skills/superpowers` | Installed |
| Superpowers MCP server | `tools/mcp/superpowers-mcp/` | Installed and built, but plugin install is preferred |
| Stitch MCP server | `node_modules/stitch-mcp/` | Installed |
| Google Cloud CLI | `tools/google-cloud/bin/gcloud` | Installed locally, no sudo |
| MCP project config | `.mcp.json` | Created |

## Superpowers

Superpowers is installed as a Codex plugin/skill pack:

```bash
ls -la ~/.agents/skills/superpowers
```

Restart Codex after installation so native skill discovery reloads it.

To update Superpowers:

```bash
cd ~/.codex/superpowers
git pull
```

## Stitch

Stitch MCP requires a Google Cloud project with the Stitch API enabled and application-default credentials.

Replace `REPLACE_WITH_GCP_PROJECT_ID` in `.mcp.json` with the real Google Cloud project id.

Then authenticate and enable the API:

```bash
npm run gcloud -- auth login --no-launch-browser
npm run gcloud -- config set project YOUR_PROJECT_ID
npm run gcloud -- auth application-default login --no-launch-browser
npm run gcloud -- auth application-default set-quota-project YOUR_PROJECT_ID
npm run gcloud -- beta services mcp enable stitch.googleapis.com
```

After that, test Stitch:

```bash
GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID npm run mcp:stitch
```

## Notes

- The Homebrew cask installation was not used because it required sudo access to `/usr/local/Caskroom`.
- Google Cloud CLI is installed locally under this project to avoid machine-level permission changes.
- `.gcloud/` stores local project credentials and should not be committed if this becomes a git repository.
