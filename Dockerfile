# Install dependencies and build
FROM node:12.2-alpine AS builder
WORKDIR /usr/src/app-build
ADD package.json /usr/src/app-build
ADD package-lock.json /usr/src/app-build
RUN npm install --only=prod

# Load the source code and execute
FROM node:12.2-alpine AS runner
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app-build/node_modules ./node_modules
ADD index.js /usr/src/app
ADD proto /usr/src/app/proto


#
# Install Docker to get the logs out of the shit
# -- This is needed only for MacOSX pourpose --
#

# RUN apk add --no-cache \
# 		ca-certificates

# set up nsswitch.conf for Go's "netgo" implementation (which Docker explicitly uses)
# - https://github.com/docker/docker-ce/blob/v17.09.0-ce/components/engine/hack/make.sh#L149
# - https://github.com/golang/go/blob/go1.9.1/src/net/conf.go#L194-L275
# - docker run --rm debian:stretch grep '^hosts:' /etc/nsswitch.conf
# RUN [ ! -e /etc/nsswitch.conf ] && echo 'hosts: files dns' > /etc/nsswitch.conf

# ENV DOCKER_CHANNEL stable
# ENV DOCKER_VERSION 18.09.1
# TODO ENV DOCKER_SHA256
# https://github.com/docker/docker-ce/blob/5b073ee2cf564edee5adca05eee574142f7627bb/components/packaging/static/hash_files !!
# (no SHA file artifacts on download.docker.com yet as of 2017-06-07 though)

# RUN set -eux; \
# 	\
# # this "case" statement is generated via "update.sh"
# 	apkArch="$(apk --print-arch)"; \
# 	case "$apkArch" in \
# 		x86_64) dockerArch='x86_64' ;; \
# 		armhf) dockerArch='armel' ;; \
# 		aarch64) dockerArch='aarch64' ;; \
# 		ppc64le) dockerArch='ppc64le' ;; \
# 		s390x) dockerArch='s390x' ;; \
# 		*) echo >&2 "error: unsupported architecture ($apkArch)"; exit 1 ;;\
# 	esac; \
# 	\
# 	if ! wget -O docker.tgz "https://download.docker.com/linux/static/${DOCKER_CHANNEL}/${dockerArch}/docker-${DOCKER_VERSION}.tgz"; then \
# 		echo >&2 "error: failed to download 'docker-${DOCKER_VERSION}' from '${DOCKER_CHANNEL}' for '${dockerArch}'"; \
# 		exit 1; \
# 	fi; \
# 	\
# 	tar --extract \
# 		--file docker.tgz \
# 		--strip-components 1 \
# 		--directory /usr/local/bin/ \
# 	; \
# 	rm docker.tgz; \
# 	\
# 	dockerd --version; \
# 	docker --version


ENV NODE_ENV=production
WORKDIR /usr/src/app
CMD node index.js