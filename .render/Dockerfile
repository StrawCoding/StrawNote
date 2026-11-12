# syntax=docker/dockerfile:1.7

# Adds a start script to the published StrawNote image. Nothing is compiled here.
FROM ghcr.io/strawcoding/strawnote:stable

COPY --chmod=0755 start.sh /usr/local/bin/render-start.sh

CMD ["/usr/local/bin/render-start.sh"]
