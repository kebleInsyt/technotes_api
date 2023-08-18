const Note = require("../models/Note");
const User = require("../models/User");
// const asyncHandler = require('express-async-handler')

// @desc Get user notes
// @route GET /notes
// @access Private
const getAllNotes = async (req, res) => {
  //get user notes from mongo
  const notes = await Note.find().lean();

  //if no users
  if (!notes?.length)
    return res.status(400).json({ message: "No notes found" });

    //add username to each note before sending response
    const notesWithUser = await Promise.all(notes.map(async (note) => {
        const user = await User.findById(note.user).lean().exec();
        return { ...note, username: user?.username}
    }))

  res.json(notesWithUser);
}

// @desc Create new note
// @route POST /notes/
// @access Private
const createNewNote = async (req, res) => {
    const { title, text, user } = req.body;

    //confirm data
    if (!user || !title || !text) return res.status(400).json({ message: "All fields are required" });

    //check if user exits
    const user_id = await User.findById(user).lean().exec();
    if(!user_id) return res.status(400).json({message: "User does not exist"})

    //check if note already exists
    const duplicate = await Note.findOne({ title })
      .collation({ locale: "en", strength: 2 })
      .lean()
      .exec();
    if (duplicate) return res.status(400).json({ message: "Duplicate note title" });

    //create and store new note
    const note = await Note.create({ user: user_id, title, text });

    //check if note was created
    if (note) {
      res.status(201).json({ mesaage: `New note created` });
    } else {
      res.status(400).json({ message: "Invalid note data received" });
    }       
}

// @desc  update note
// @route PATCH /notes
// @access Private
const updateNote = async (req, res) => {
  const { title, text, user, completed, id } = req.body;

  //confirm data
  if (!user || !title || !text || !id || typeof completed !== "boolean")
    return res.status(400).json({ message: "All fields are required" });

     //check if user exits
    const user_id = await User.findById(user).lean().exec();
    if(!user_id) return res.status(400).json({message: "User does not exist"})

  //Does the note exist to update
  const note = await Note.findById(id).exec();
  if (!note) return res.status(400).json({ message: "Note not found" });

  //check for duplicate
  const duplicate = await Note.findOne({ title })
    .collation({ locale: "en", strength: 2 })
    .lean()
    .exec();

  //allow updates to only the original user
  if (duplicate && duplicate?._id.toString() !== id)
    return res.status(409).json({ message: "Duplicate note found" });

  note.title = title;
  note.text = text;
  note.completed = completed;
  note.user = user_id;

  const updatedNote = await note.save();

  res.json({ message: `${updatedNote.title} updated` });
}

// @desc delete note
// @route DELETE /notes
// @access Private
const deleteNote = async (req, res) => {
    const { id } = req.body;

    //confirm data
    if(!id) return res.status(400).json({ message: 'Note ID required' });

    //confirm note exits to update
    const note = await Note.findById(id).exec();
    if(!note) return res.status(400).json({ message: 'Note not found'});

    const result = await note.deleteOne();

    res.json({ message: `Note ${result.title} with ID ${result._id} deleted`})
}

module.exports = {
    getAllNotes,
    createNewNote,
    updateNote,
    deleteNote
}