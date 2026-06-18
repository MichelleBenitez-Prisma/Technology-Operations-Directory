# Database Diagram

The diagram below shows the initial SQLite database model. The design centers on `technology_assets`, with reference tables for ownership and category, detail tables for type-specific facts, and relationship tables for tags, vendors, integrations, scheduled processes, and reviews.

```mermaid
erDiagram
    ASSET_TYPES ||--o{ TECHNOLOGY_ASSETS : categorizes
    TEAMS ||--o{ PEOPLE : includes
    TEAMS ||--o{ TECHNOLOGY_ASSETS : owns
    PEOPLE ||--o{ TECHNOLOGY_ASSETS : "technical owner"
    PEOPLE ||--o{ TECHNOLOGY_ASSETS : "business owner"
    VENDORS ||--o{ TECHNOLOGY_ASSETS : "primary vendor"

    TECHNOLOGY_ASSETS ||--o{ ASSET_ENVIRONMENTS : has
    TECHNOLOGY_ASSETS ||--o| APPLICATION_DETAILS : extends
    TECHNOLOGY_ASSETS ||--o| WEBSITE_DETAILS : extends
    TECHNOLOGY_ASSETS ||--o| SERVER_DETAILS : extends
    TECHNOLOGY_ASSETS ||--o| DATABASE_DETAILS : extends
    TECHNOLOGY_ASSETS ||--o| VENDOR_SERVICE_DETAILS : extends
    TECHNOLOGY_ASSETS ||--o| PAYMENT_SERVICE_DETAILS : extends

    TECHNOLOGY_ASSETS ||--o{ ASSET_VENDORS : uses
    VENDORS ||--o{ ASSET_VENDORS : supports

    TECHNOLOGY_ASSETS ||--o{ INTEGRATIONS : "source asset"
    TECHNOLOGY_ASSETS ||--o{ INTEGRATIONS : "target asset"
    TEAMS ||--o{ INTEGRATIONS : owns

    TECHNOLOGY_ASSETS ||--o{ SCHEDULED_PROCESSES : has
    TEAMS ||--o{ SCHEDULED_PROCESSES : owns

    TECHNOLOGY_ASSETS ||--o{ REVIEW_RECORDS : reviewed
    PEOPLE ||--o{ REVIEW_RECORDS : performs

    TECHNOLOGY_ASSETS ||--o{ ASSET_TAGS : tagged
    TAGS ||--o{ ASSET_TAGS : labels

    TECHNOLOGY_ASSETS ||--o{ ASSET_ATTRIBUTES : has

    ASSET_TYPES {
        integer id PK
        text code UK
        text name
        text description
    }

    TECHNOLOGY_ASSETS {
        integer id PK
        text asset_key UK
        text name
        integer asset_type_id FK
        text lifecycle_status
        text criticality
        text data_classification
        integer owner_team_id FK
        integer technical_owner_person_id FK
        integer business_owner_person_id FK
        integer primary_vendor_id FK
        text production_url
        text repository_url
        text documentation_url
        text runbook_url
        text monitoring_url
        text support_channel
        text next_review_due_at
    }

    TEAMS {
        integer id PK
        text name UK
        text department
        text email
    }

    PEOPLE {
        integer id PK
        text display_name
        text email UK
        integer team_id FK
        integer active
    }

    VENDORS {
        integer id PK
        text name UK
        text website_url
        text support_url
        text contract_end_date
    }

    INTEGRATIONS {
        integer id PK
        text name
        integer source_asset_id FK
        integer target_asset_id FK
        text integration_type
        text direction
        text protocol
        text criticality
        integer owner_team_id FK
    }

    SCHEDULED_PROCESSES {
        integer id PK
        integer asset_id FK
        text name
        text schedule_kind
        text schedule_expression
        text schedule_timezone
        integer owner_team_id FK
        text last_known_success_at
    }

    REVIEW_RECORDS {
        integer id PK
        integer asset_id FK
        text reviewed_at
        integer reviewed_by_person_id FK
        text review_status
        text next_review_due_at
    }
```

