
build:
	docker build -t run-in-docker .

run: build
	docker run \
		-v /var/run/docker.sock:/var/run/docker.sock \
		run-in-docker