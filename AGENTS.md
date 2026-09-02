# AGENTS.md — BombSquad / Ballistica Development Reference

## Purpose

Reference for coding agents working on BombSquad, Ballistica, plugins, custom servers, and related asset pipelines.

## Project Identity

- **BombSquad** is a physics-driven multiplayer party game created by Eric Froemling.
- **Ballistica** is the engine and infrastructure behind BombSquad.
- Upstream repository: https://github.com/efroemling/ballistica
- Official portal: https://ballistica.net/
- Modding docs: https://github.com/efroemling/ballistica/wiki
- Python API docs: https://ballistica.net/docs

## Licensing

- Code in `efroemling/ballistica` is MIT licensed.
- Official assets (models, textures, sounds) are proprietary.
- Do not redistribute official assets without permission.

## Version Compatibility

- Plugin Manager main branch: BombSquad 1.7.37+ / API 9
- API 8 branch: BombSquad 1.7.20–1.7.36
- API 7 branch: BombSquad 1.7.0–1.7.19
- Modern imports: `babase`, `bascenev1`, `bauiv1`

## Plugin Manager

- Repo: https://github.com/bombsquad-community/plugin-manager
- Supports custom GitHub sources: `owner/repo@branch`
- Install via Dev Console one-liner (see bombSquad_complete_guide.md)

## Multiplayer Input

- PC/Mac/Linux supports mixed input: keyboard + gamepads + BombSquad Remote (phones)
- BombSquad Remote: up to 8 devices
- All must be on same local Wi-Fi/network

## Asset Pipeline

- `.bob`: character models
- `.cob`: collision meshes
- Blender addon: https://github.com/bombsquad02420/blender-addon
- File spec tools: https://github.com/bombsquad02420/bombsquad-filespec

## Useful Repos

- Engine: https://github.com/efroemling/ballistica
- Plugin Manager: https://github.com/bombsquad-community/plugin-manager
- Sample plugin source: https://github.com/bombsquad-community/sample-plugin-source
- Server scripts: https://github.com/bombsquad-community/server-scripts
- Community hub: https://bombsquad-community.web.app/

## Agent Rules

- Preserve API compatibility unless breaking change is requested.
- State target BombSquad build/API version in README.
- Do not bundle proprietary assets.
- Keep plugins readable and unobfuscated.

## Links

- https://ballistica.net/
- https://github.com/efroemling/ballistica
- https://github.com/bombsquad-community/plugin-manager
- https://bombsquad-community.web.app/
