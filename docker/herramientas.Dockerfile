# Entorno de desarrollo para los scripts de herramientas/: Python (numpy, Pillow, cryptography) y Node.
FROM node:22-bookworm-slim AS node

FROM python:3.13-slim-bookworm
# Solo hace falta el ejecutable de Node (las pruebas .mjs no usan paquetes de npm).
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt
WORKDIR /proyecto
CMD ["bash"]
