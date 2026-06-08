require('module-alias/register');
require('dotenv').config();
require('@queues');
require('@scripts/scheduler');
const { startPolling } = require('@scripts/botPolling');
startPolling();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');

const corsOptions = require('@config/corsOptions');
const verifyAdmin = require('@middleware/verifyAdmin');

const publicRoutes = require('@routes/api/public');
const adminRoutes = require('@routes/api/admin');
const systemRoutes = require('@routes/api/system');
const clientRoutes = require('@routes/api/client');
const verifyClient = require('@middleware/verifyClient');

require('@config/errorHandler');

const app = express();

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

publicRoutes(app);
systemRoutes(app);

app.use('/api/client', verifyClient);
clientRoutes(app);

app.use(verifyAdmin);
adminRoutes(app);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\nDevSignal backend running on http://localhost:${PORT}\n`);
});
