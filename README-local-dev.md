# Local Dev Quickstart

## Prereqs

- Node 20
- Corepack (Yarn 4)

## Install

```
yarn --cwd kateri-monorepo install
```

## Web env

Copy and fill Firebase keys:

```
cp kateri-monorepo/packages/web/.env.local.example kateri-monorepo/packages/web/.env.local
```

## Typecheck & Build

```
yarn --cwd kateri-monorepo typecheck
# build all workspaces
yarn --cwd kateri-monorepo build
```

## Emulators

(Uses default project from .firebaserc)

```
yarn --cwd kateri-monorepo workspace @kateri/functions serve
```

## Web dev

```
yarn --cwd kateri-monorepo workspace @kateri/web dev
```

## Deploy

```
# via script
yarn --cwd kateri-monorepo deploy
# or direct
firebase deploy --only functions,hosting --project kcm-firebase-b7d6a
```
