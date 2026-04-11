import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1775856443426 implements MigrationInterface {
    name = 'Migration1775856443426'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` varchar(36) NOT NULL, \`isDeleted\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`email\` varchar(255) NOT NULL, \`password\` varchar(255) NOT NULL, \`role\` enum ('admin', 'user') NOT NULL DEFAULT 'user', \`refreshToken\` varchar(255) NULL, UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`wallets\` (\`id\` varchar(36) NOT NULL, \`isDeleted\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`userId\` varchar(255) NOT NULL, \`balance\` decimal(18,2) NOT NULL DEFAULT '0.00', \`currency\` varchar(255) NOT NULL DEFAULT 'NGN', INDEX \`IDX_2ecdb33f23e9a6fc392025c0b9\` (\`userId\`), UNIQUE INDEX \`REL_2ecdb33f23e9a6fc392025c0b9\` (\`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`transactions\` (\`id\` varchar(36) NOT NULL, \`isDeleted\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`reference\` varchar(255) NOT NULL, \`walletId\` varchar(255) NOT NULL, \`type\` enum ('credit', 'debit') NOT NULL, \`amount\` decimal(18,2) NOT NULL, \`status\` enum ('pending', 'success', 'failed') NOT NULL DEFAULT 'pending', \`idempotencyKey\` varchar(255) NOT NULL, INDEX \`IDX_a88f466d39796d3081cf96e1b6\` (\`walletId\`), INDEX \`IDX_2d5fa024a84dceb158b2b95f34\` (\`type\`), INDEX \`IDX_da87c55b3bbbe96c6ed88ea7ee\` (\`status\`), INDEX \`IDX_2c9d9548cf8410e425e120b5e6\` (\`walletId\`, \`createdAt\`), UNIQUE INDEX \`IDX_dd85cc865e0c3d5d4be095d3f3\` (\`reference\`), UNIQUE INDEX \`IDX_86238dd0ae2d79be941104a584\` (\`idempotencyKey\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`wallets\` ADD CONSTRAINT \`FK_2ecdb33f23e9a6fc392025c0b97\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`wallets\` DROP FOREIGN KEY \`FK_2ecdb33f23e9a6fc392025c0b97\``);
        await queryRunner.query(`DROP INDEX \`IDX_86238dd0ae2d79be941104a584\` ON \`transactions\``);
        await queryRunner.query(`DROP INDEX \`IDX_dd85cc865e0c3d5d4be095d3f3\` ON \`transactions\``);
        await queryRunner.query(`DROP INDEX \`IDX_2c9d9548cf8410e425e120b5e6\` ON \`transactions\``);
        await queryRunner.query(`DROP INDEX \`IDX_da87c55b3bbbe96c6ed88ea7ee\` ON \`transactions\``);
        await queryRunner.query(`DROP INDEX \`IDX_2d5fa024a84dceb158b2b95f34\` ON \`transactions\``);
        await queryRunner.query(`DROP INDEX \`IDX_a88f466d39796d3081cf96e1b6\` ON \`transactions\``);
        await queryRunner.query(`DROP TABLE \`transactions\``);
        await queryRunner.query(`DROP INDEX \`REL_2ecdb33f23e9a6fc392025c0b9\` ON \`wallets\``);
        await queryRunner.query(`DROP INDEX \`IDX_2ecdb33f23e9a6fc392025c0b9\` ON \`wallets\``);
        await queryRunner.query(`DROP TABLE \`wallets\``);
        await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
    }

}
