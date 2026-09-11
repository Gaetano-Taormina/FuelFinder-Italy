import { SsrController } from '../controllers/ssrController.js';
import { rateLimiter } from '../middlewares/security.js';

export function setupSsrRoutes(app, dbProvider) {
    const ssrController = new SsrController(dbProvider);
    app.use(rateLimiter, (req, res) => ssrController.handleSsrRequest(req, res));
}
