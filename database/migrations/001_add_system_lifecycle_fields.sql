ALTER TABLE system_record_details
ADD COLUMN replacement_system TEXT;

ALTER TABLE system_record_details
ADD COLUMN retirement_notes TEXT;

DROP VIEW IF EXISTS system_record_view;

CREATE VIEW system_record_view AS
SELECT
    technology_assets.id,
    technology_assets.asset_key,
    technology_assets.name AS system_name,
    technology_assets.description,
    asset_types.code AS category_code,
    asset_types.name AS category_name,
    technology_assets.lifecycle_status AS status,
    system_record_details.business_department,
    system_record_details.department_owner,
    system_record_details.technical_owner,
    system_record_details.vendor,
    system_record_details.support_contact,
    system_record_details.hosting_location,
    system_record_details.server_name,
    system_record_details.database_name,
    technology_assets.production_url,
    system_record_details.test_url,
    technology_assets.documentation_url,
    system_record_details.password_vault_reference,
    system_record_details.renewal_date,
    technology_assets.last_reviewed_at AS last_review_date,
    system_record_details.replacement_system,
    system_record_details.retirement_notes,
    system_record_details.notes,
    technology_assets.archived_at,
    CASE
        WHEN NULLIF(TRIM(technology_assets.name), '') IS NULL
            OR NULLIF(TRIM(IFNULL(technology_assets.description, '')), '') IS NULL
            OR NULLIF(TRIM(IFNULL(asset_types.code, '')), '') IS NULL
            OR NULLIF(TRIM(IFNULL(technology_assets.lifecycle_status, '')), '') IS NULL
            OR NULLIF(TRIM(IFNULL(system_record_details.business_department, '')), '') IS NULL
            OR NULLIF(TRIM(IFNULL(system_record_details.department_owner, '')), '') IS NULL
            OR NULLIF(TRIM(IFNULL(system_record_details.technical_owner, '')), '') IS NULL
            OR NULLIF(TRIM(IFNULL(system_record_details.support_contact, '')), '') IS NULL
        THEN 1
        ELSE 0
    END AS is_incomplete,
    TRIM(
        CASE WHEN NULLIF(TRIM(technology_assets.name), '') IS NULL THEN 'system_name,' ELSE '' END ||
        CASE WHEN NULLIF(TRIM(IFNULL(technology_assets.description, '')), '') IS NULL THEN 'description,' ELSE '' END ||
        CASE WHEN NULLIF(TRIM(IFNULL(asset_types.code, '')), '') IS NULL THEN 'category,' ELSE '' END ||
        CASE WHEN NULLIF(TRIM(IFNULL(technology_assets.lifecycle_status, '')), '') IS NULL THEN 'status,' ELSE '' END ||
        CASE WHEN NULLIF(TRIM(IFNULL(system_record_details.business_department, '')), '') IS NULL THEN 'business_department,' ELSE '' END ||
        CASE WHEN NULLIF(TRIM(IFNULL(system_record_details.department_owner, '')), '') IS NULL THEN 'department_owner,' ELSE '' END ||
        CASE WHEN NULLIF(TRIM(IFNULL(system_record_details.technical_owner, '')), '') IS NULL THEN 'technical_owner,' ELSE '' END ||
        CASE WHEN NULLIF(TRIM(IFNULL(system_record_details.support_contact, '')), '') IS NULL THEN 'support_contact,' ELSE '' END,
        ','
    ) AS missing_fields,
    technology_assets.created_at,
    technology_assets.updated_at
FROM technology_assets
JOIN asset_types ON asset_types.id = technology_assets.asset_type_id
LEFT JOIN system_record_details ON system_record_details.asset_id = technology_assets.id;
