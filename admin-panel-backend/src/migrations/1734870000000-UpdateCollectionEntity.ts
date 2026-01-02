import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateCollectionEntity1734870000000 implements MigrationInterface {
    name = 'UpdateCollectionEntity1734870000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if table exists
        const table = await queryRunner.getTable("collections");

        if (!table) {
            // Create table if not exists
            await queryRunner.query(`
                CREATE TABLE "collections" (
                    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                    "user_id" uuid NOT NULL,
                    "title" character varying NOT NULL,
                    "description" text,
                    "image" character varying,
                    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_collections_id" PRIMARY KEY ("id")
                )
            `);
            // Add foreign key
            await queryRunner.query(`
                ALTER TABLE "collections" 
                ADD CONSTRAINT "FK_collections_user_id" 
                FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            `);
            // Create join table for ManyToMany
            await queryRunner.query(`
                CREATE TABLE "collection_properties" (
                    "collectionId" uuid NOT NULL,
                    "propertyId" uuid NOT NULL,
                    CONSTRAINT "PK_collection_properties" PRIMARY KEY ("collectionId", "propertyId")
                )
            `);
            // Add foreign keys for join table
            await queryRunner.query(`
                ALTER TABLE "collection_properties" 
                ADD CONSTRAINT "FK_collection_properties_collection" 
                FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE
            `);
            await queryRunner.query(`
                ALTER TABLE "collection_properties" 
                ADD CONSTRAINT "FK_collection_properties_property" 
                FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE
            `);
        } else {
            // If table exists, apply the column updates (rename name->title, add image)
            const nameColumn = table.findColumnByName("name");
            const titleColumn = table.findColumnByName("title");

            if (nameColumn && !titleColumn) {
                await queryRunner.renameColumn("collections", "name", "title");
            }

            if (!table.findColumnByName("image")) {
                await queryRunner.query(`ALTER TABLE "collections" ADD "image" character varying`);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // We probably don't want to drop the table in down() if it existed before, 
        // but for this specific migration file effectively acting as "Create or Update", 
        // precise revert is hard. Simplified down:
        const table = await queryRunner.getTable("collections");
        if (table) {
            if (table.findColumnByName("image")) {
                await queryRunner.query(`ALTER TABLE "collections" DROP COLUMN "image"`);
            }
            if (table.findColumnByName("title")) {
                await queryRunner.renameColumn("collections", "title", "name");
            }
        }
    }
}
