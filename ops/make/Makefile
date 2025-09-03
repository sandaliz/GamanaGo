.PHONY: up down logs gateway web

up:
\tdocker compose -f infra/compose.dev.yml up --build

down:
\tdocker compose -f infra/compose.dev.yml down --volumes --remove-orphans

logs:
\tdocker compose -f infra/compose.dev.yml logs -f

gateway:
\tdocker compose -f infra/compose.dev.yml up -d gateway

web:
\tdocker compose -f infra/compose.dev.yml up -d web
