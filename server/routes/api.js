/* oxlint-disable no-console */
import { ApiController } from '../controllers/apiController.js';

export function setupApiRoutes(app, db) {
    const controller = new ApiController(db);
    
    app.get('/api/stats', controller.getStats);
    app.get('/api/stations', controller.getStations);
    app.get('/api/cities', controller.getCities);
    app.get('/api/cities/validate', controller.validateCity);
}
