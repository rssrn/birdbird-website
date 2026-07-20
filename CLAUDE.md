# CLAUDE.md

## Project Overview

This is a configured instance of the [birdbird](https://github.com/rssrn/birdbird) HTML viewer,
customised to showcase bird observations from one feeder/location. It has no pipeline logic of
its own — viewer template files are deployed here from the `birdbird` repo.

**Paired repo**: `../birdbird` (`rssrn/birdbird`) — the source project. Viewer templates
(`src/birdbird/templates/`) are rsynced into this repo via `~/bin/deploy-birdbird-viewer` and
pushed to deploy. Instance-specific customisation lives in `dist/config.js`.

- **GitHub repo**: `rssrn/birdbird-website`
