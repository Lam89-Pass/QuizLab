FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /quizlab-api .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
COPY --from=build /quizlab-api /quizlab-api
EXPOSE 8080
CMD ["/quizlab-api"]