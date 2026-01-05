
import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { entities } from '../entities';

const configs = [
    {
        label: 'Native Postgres (vytvytskyi/for_you_real_estate)',
        url: 'postgresql://vytvytskyi@localhost:5432/for_you_real_estate'
    },
    {
        label: 'Native Postgres (postgres/postgres)',
        url: 'postgresql://postgres:postgres@localhost:5432/postgres'
    },
    {
        label: 'Possible Admin (admin/admin123 @ 5432)',
        url: 'postgresql://admin:admin123@localhost:5432/admin_panel'
    },
    // We know 5435 failed (ECONNREFUSED), but let's keep it for completeness in log if it magically works
    {
        label: 'Docker Port (admin/admin123 @ 5435)',
        url: 'postgresql://admin:admin123@localhost:5435/admin_panel'
    }
];

async function findData() {
    console.log('🔍 Searching for user short@gmail.com in available databases...');

    for (const config of configs) {
        process.stdout.write(`Testing ${config.label}... `);
        const ds = new DataSource({
            type: 'postgres',
            url: config.url,
            entities: entities,
            synchronize: false,
            logging: false
        });

        try {
            await ds.initialize();

            try {
                const user = await ds.getRepository(User).findOne({ where: { email: 'short@gmail.com' } });
                if (user) {
                    console.log(`✅ SUCCESS! Found user in ${config.label}`);
                    console.log(`ℹ️  DATABASE_URL should be: ${config.url}`);
                    await ds.destroy();
                    process.exit(0);
                } else {
                    console.log('❌ Connected, but user NOT found.');
                }
            } catch (queryErr) {
                console.log(`❌ Connected, but query failed (table missing?): ${(queryErr as Error).message}`);
            }

            await ds.destroy();
        } catch (err: any) {
            console.log(`❌ Connection failed: ${err.code || err.message}`);
        }
    }

    console.log('\n⚠️  Could not find the user in any accessible database.');
    console.log('👉 Note: Docker appears to be down ("Cannot connect to Docker daemon"), so port 5435 is unreachable.');
    process.exit(1);
}

findData();
