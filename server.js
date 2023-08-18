require('dotenv').config();
require('express-async-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser')
const cors = require('cors');
const mongoose = require('mongoose');

const { logger, logEvents } = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler')
const corsOptions = require('./config/corsOptions')
const connectDB = require('./config/db_conn')

const app = express();
const PORT  = process.env.PORT || 3500;

connectDB();

//middleware for logging events to logs folder
app.use(logger);

app.use(express.json());

app.use(cors(corsOptions))

app.use(cookieParser());

//serve static files from the public folder
app.use('/', express.static(path.join(__dirname, 'public')));

//route handlers - root, /users, /notes
app.use('/', require('./routes/root'));
app.use('/auth', require('./routes/authRoutes'));
app.use('/users', require('./routes/userRoutes'));
app.use('/notes', require('./routes/noteRoutes'));


//handle 404 page
app.all('*', (req, res) => {
    res.status(404);
    if(req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'views', '404.html'))
    } else if(req.accepts('json')) {
        res.json({message: '404 Not Found'})
    } else {
        res.type('txt').send('404 Not Found')
    }
})

//middleware for logging error events to logs folder
app.use(errorHandler);

mongoose.connection.once('open', () => {
    console.log('connected to MongDB')
    app.listen(PORT, () => console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`))
})

mongoose.connection.on('error', err => {
    console.log('====================================');
    console.log(err);
    console.log('====================================');
    logEvents(`${err.no}: ${err.code}\t${err.syscall}\t${err.hostname}`, 'mongoErrLog.log')
})
