# Ingress & TLS

One address, one certificate, one way in. Every request from the internet arrives at the reverse proxy, which decides where it goes and what must happen before it gets there.

## Behaviour rules

1. **One entry point.** Every published service lives at its own subdomain under a single parent, served by one reverse proxy. Nothing else listens to the internet except SSH.
2. **Encryption is not optional.** Plain HTTP is redirected to HTTPS. A wildcard certificate is obtained and renewed automatically by proving control of the domain through DNS, so no individual service name is ever published in a certificate log.
3. **Security headers are applied once.** Strict transport security, content-type and framing protections and a referrer policy are applied by a shared rule rather than configured per service. Strict transport security is deliberately not submitted for browser preloading, as that commitment cannot be undone.
4. **Rate limits fit the endpoint.** Sign-in pages are limited tightly, because no person signs in quickly. Registry pulls are limited generously, because one legitimate image pull opens many parallel requests. One global limit would be wrong for both.
5. **Routing is declared, not discovered.** Routes come from configuration files rendered by the repository. The proxy is never given access to the container runtime's control socket.
6. **The gate is applied by default.** A new route is protected unless it is explicitly declared as one of the three named exceptions or as a public application.
7. **The routing view is protected.** The proxy's own interface, which reveals every route and certificate, sits behind the gate like anything else.

## Rootless ingress

The reverse proxy runs like every other service on Atlas — non-root, every capability dropped, read-only root filesystem, no host paths beyond what it needs. It never binds the standard web ports itself; it binds unprivileged ones, and the host firewall (nftables) redirects 80 and 443 to them before traffic reaches the container.

Traffic between the proxy and every other service travels over local-only published ports that the firewall refuses to expose. Service-to-database isolation is unaffected.

## Scenarios

```gherkin
Feature: Ingress

  Scenario: A visitor arrives over plain HTTP
    When a visitor opens a service address without encryption
    Then they are redirected to the encrypted address

  Scenario: A new service is published
    Given a service is declared without stating that it is an exception
    When the maintainer converges
    Then its address is reachable over HTTPS
    And it is protected by the gate

  Scenario: Certificate renewal
    Given the certificate is approaching expiry
    When renewal runs
    Then a new certificate is obtained and loaded without downtime
    And no service address appears in any public certificate log

  Scenario: A certificate fails to renew
    Given renewal has failed and expiry is less than seven days away
    Then the maintainer receives an immediate notification

  Scenario: An unknown address is requested
    When a request arrives for a subdomain that is not declared
    Then it is refused
```

## Permissions

| Action | `admin` | `household` | `collaborator` | Anonymous |
| ------ | ------- | ----------- | -------------- | --------- |
| Reach a published service | Yes | Per role | Per role | Only public endpoints |
| View the routing state | Yes, behind the gate | No | No | No |
| Add or change a route | Through the repository only | No | No | No |
