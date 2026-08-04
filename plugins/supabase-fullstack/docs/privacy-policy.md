# Supabase Fullstack Privacy Policy

`supabase-fullstack` is a documentation and workflow plugin. The bundle itself does not operate a hosted service, collect analytics, or transmit user data to a Thomas Hulihan-managed backend.

## What the plugin does

- Provides skill instructions, reference material, and helper scripts for Supabase security and Postgres performance reviews.
- May guide an agent to inspect local files, local configuration, or a user-authorized Supabase environment when those resources are available in the current session.

## Data handling

- Plugin content is packaged as static files inside the local plugin bundle.
- Any data access happens through the host agent runtime, local filesystem access, or user-authorized tools such as the Supabase App connector.
- This plugin does not add its own telemetry, tracking pixels, or separate data retention layer.

## User responsibility

- Users are responsible for deciding which repositories, databases, environments, and credentials are exposed to the host agent session.
- Sensitive credentials such as `service_role` keys should remain restricted to trusted server environments and should not be exposed to browser or mobile clients.

## Changes

Privacy terms may be updated as the plugin packaging or distribution model changes. The canonical source of truth should live in the public repository for this plugin once the current local-only bundle is promoted to a Git-backed home.
