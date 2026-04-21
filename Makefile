.PHONY: check format

## check: Run all CI checks locally (typecheck, lint, format, tests)
check:
	npm run typecheck
	npm run lint
	npm run format:check
	npm run test

## format: Auto-fix lint issues and format all source files
format:
	npm run lint:fix
	npm run format
