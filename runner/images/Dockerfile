FROM node:22-alpine
RUN apk add --no-cache strace su-exec
# Root-only observation directory: a named volume mounted here inherits mode 0700 root:root,
# so the unprivileged tool cannot read, write, or unlink the trace while the run is in flight.
RUN mkdir -m 0700 /obs
