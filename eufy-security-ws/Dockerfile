ARG BUILD_FROM
FROM $BUILD_FROM

ARG EUFY_SECURITY_WS_VERSION

WORKDIR /usr/src/app
RUN \
    set -x \
    && apk add --no-cache \
    nodejs \
    npm \
    jq \
    && npm install --force \
    "eufy-security-ws@${EUFY_SECURITY_WS_VERSION}"

COPY --chmod=755 2fa-helper /usr/src/2fa-helper
WORKDIR /usr/src/2fa-helper
RUN npm install --omit=dev

COPY run.sh /
RUN chmod a+x /run.sh
WORKDIR /data

CMD [ "/run.sh" ]