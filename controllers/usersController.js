const User = require('../models/User')
const Note = require('../models/Note')
// const asyncHandler = require('express-async-handler')
const bcrypt = require('bcrypt');

// @desc Get all users
// @route GET /users
// @access Private
const getAllUsers =  async (req, res) => {
    //get all users from mongo
    const users = await User.find().select('-password').lean();

    //if no users
    if(!users?.length) return res.status(400).json({message: 'No users found'});

    res.json(users);
}

// @desc Create new user
// @route POST /users
// @access Private
const createNewUser = async (req, res) => {
    const { username, password, roles } = req.body
    
    //capitalixe the first letter before sending to db
    // const capitalized = username.charAt(0).toUpperCase() + username.slice(1);

    //confirm data
    if(!username || !password) return res.json({ message: 'All fields are required' }); 

    //check if user already exists
    const duplicate = await User.findOne({ username })
      .collation({ locale: "en", strength: 2 })
      .lean()
      .exec();

    if(duplicate) return res.json({ message: 'User already exits'});

    //hash password and confirm roles
    const hashedPwd = await bcrypt.hash(password, 10) //salt round
    const userObject = (!Array.isArray(roles) || !roles.length) ?
        { username, password: hashedPwd} : 
        { username, password: hashedPwd, roles}

    //create and store new user
    const user = await User.create(userObject);
 
    //check if user was created 
    if(user) {
        res.status(201).json({ mesaage: `New user ${username} created` });
    } else {
        res.status(400).json({ message: 'Invalid user data recieved'})
    }       
}


// @desc Update a user
// @route PATCH /users
// @access Private
const updateUser = async (req, res) => {
    const { id, username, password, roles, active } = req.body

    //confirm data
    if(!id || !username || !Array.isArray(roles) || !roles.length || typeof active !== 'boolean') return res.status(400).json({ message: 'All fields except password are required'});

     //Does the user exists to update
    const user = await User.findById(id).exec();
    if(!user) return res.status(400).json({ message: 'User not found' });

    //check for duplicate
    const duplicate = await User.findOne({ username })
      .collation({ locale: "en", strength: 2 })
      .lean()
      .exec();

    //allow updates to only the original user
    if(duplicate && duplicate?._id.toString() !== id) return res.status(409).json({ message: 'Duplicate username' });

   
    user.username = username;
    user.roles = roles;
    user.active = active;

    if(password) user.password = await bcrypt.hash(password, 10);

    const updatedUser = await user.save();

    res.json({ message: `${updatedUser.username} updated`})
}


// @desc delete a user
// @route DELETE /users
// @access Private
const deleteUser = async (req, res) => {
    const { id } = req.body

    //confirm data
    if(!id) return res.status(400).json({ message: 'User ID required'});

    //does user have assigned notes
    const note = await Note.findOne({ user: id}).lean().exec();
    if(note) return res.status(400).json({ message: 'User has assigned noted'});

    //does the user exit to delete
    //Does the user exists to update
    const user = await User.findById(id).exec();
    if(!user) return res.status(400).json({ message: 'User not found' });

    const result = await user.deleteOne();

    res.json({ message: `Username ${result.username} with ID ${result._id} deleted`})
}

module.exports = {
    getAllUsers,
    createNewUser,
    updateUser,
    deleteUser
}