.PHONY: help install-backend install-frontend install dev-backend dev-frontend dev build-frontend clean

help:
	@echo "Targets:"
	@echo "  install-backend   Install backend dependencies"
	@echo "  install-frontend  Install frontend dependencies"
	@echo "  install           Install all dependencies"
	@echo "  dev-backend       Run backend in reload mode"
	@echo "  dev-frontend      Run frontend dev server"
	@echo "  dev               Run backend + frontend (two processes)"
	@echo "  build-frontend    Build frontend assets"
	@echo "  clean             Clean backend and frontend artifacts"

install-backend:
	$(MAKE) -C backend install

install-frontend:
	$(MAKE) -C frontend install

install: install-backend install-frontend

dev-backend:
	$(MAKE) -C backend run

dev-frontend:
	$(MAKE) -C frontend run

dev:
	$(MAKE) -C backend run & \
	$(MAKE) -C frontend run & \
	wait

build-frontend:
	$(MAKE) -C frontend build

clean:
	$(MAKE) -C backend clean
	$(MAKE) -C frontend clean
