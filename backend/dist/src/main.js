"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const swagger_1 = require("@nestjs/swagger");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const path_1 = require("path");
async function bootstrap() {
    dotenv.config({ path: 'ENV_FILENAME' });
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const allowedOrigins = [
        /^http?:\/\/(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?$/i,
        /^https?:\/\/(?:[a-z0-9-]+\.)*addosser\.com(?::\d+)?$/i,
    ];
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin) {
                return callback(null, true);
            }
            const isAllowed = allowedOrigins.some((allowed) => allowed instanceof RegExp ? allowed.test(origin) : allowed === origin);
            if (isAllowed) {
                return callback(null, true);
            }
            return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
        },
        credentials: true,
    });
    app.use(bodyParser.json({ limit: '100mb' }));
    app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Payroll API')
        .setDescription('The Payroll Management API documentation')
        .setVersion('1.0')
        .addTag('payroll')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api', app, document);
    app.useStaticAssets((0, path_1.join)(process.cwd(), 'uploads'), {
        prefix: '/uploads/',
    });
    await app.listen(3082);
}
bootstrap();
//# sourceMappingURL=main.js.map