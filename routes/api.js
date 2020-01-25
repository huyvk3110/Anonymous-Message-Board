/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var ObjectId = require('mongodb').ObjectId
var expect = require('chai').expect;

function getBoard(name, db) {
  return new Promise((res, rej) => db.collection('boards').findAndModify(
    { name },
    {},
    {
      $setOnInsert: {
        name,
        created_on: new Date(),
      },
      $set: {
        last_login: new Date(),
      }
    },
    {
      upsert: true, new: true,
    }
  )
    .then(data => res(data.value))
    .catch(error => rej(error)))
}

function getReplies(threadId, db) {
  return new Promise((res, rej) => db.collection('replies').find({ thread_id: new ObjectId(threadId) })
    .toArray()
    .then(data => {
      console.log(threadId, data)
      res(data)
    })
    .catch(error => rej(error))
  )
}

module.exports = function (app, db) {

  app.route('/api/threads/:board')
    .get((req, res) => {
      const { board } = req.params;
      getBoard(board, db).then(data => {
        db.collection('threads').find({ board_id: new ObjectId(data._id) })
          .toArray()
          .then(data => {
            Promise.all(
              data.map(o => new Promise((res, rej) => {
                getReplies(o._id, db)
                  .then(replies => res({ ...o, replies }))
                  .catch(error => rej({ error }))
              }))
            )
              .then(data => res.json(data))
              .catch(error => res.json({ error }))
          })
          .catch(error => res.json({ error }));
      }).catch(error => res.json({ error }))
    })
    .post((req, res) => {
      const { board } = req.params;
      const { text, delete_password } = req.body;
      // text, delete_password, created_on, _id, bumped_on, reported, replies, 
      getBoard(board, db).then(data => {
        db.collection('threads').insertOne(
          {
            text,
            delete_password,
            created_on: new Date(),
            bumped_on: new Date(),
            reported: false,
            board_id: new ObjectId(data._id),
          }
        )
          .then(data => {
            res.redirect(`/b/${board}/`)
            // getReplies(data.ops[0]._id, db)
            //   .then(replies => res.json({ ...data.ops[0], replies }))
            //   .catch(error => res.json({ error }))
          })
          .catch(error => res.json({ error1: error }))
      }).catch(error => res.json({ error2: error }));
    })
    .put((req, res) => {
      const { board } = req.params;
      const { report_id } = req.body;

      db.collection('threads').findOneAndUpdate(
        { _id: new ObjectId(report_id) },
        {
          $set: { "reported": true }
        }
      )
        .then(data => res.json('success'))
        .catch(error => res.json('error'))
    })
    .delete((req, res) => {
      const { board } = req.params;
      const { thread_id, delete_password } = req.body;

      db.collection('threads').findOne({ _id: new ObjectId(thread_id) })
        .then(data => {
          if (!data) return res.json('error');
          if (data.delete_password !== delete_password) return res.json('incorrect password');
          db.collection('threads').remove({ _id: new ObjectId(thread_id) })
            .then(data => res.json('success'))
            .catch(error => res.json('error'))
        })
        .catch(error => res.json('error'));
    })

  app.route('/api/replies/:board')
    .get((req, res) => {
      const { board } = req.params;
      const { thread_id } = req.query;
      getReplies(thread_id, db)
        .then(data => res.json(data))
        .catch(error => res.json({ error }));
    })
    .post((req, res) => {
      const { board } = req.params;
      const { thread_id, text, delete_password } = req.body;
      db.collection('replies').insertOne({ text, delete_password, thread_id: new ObjectId(thread_id), created_on: new Date(), bumped_on: new Date(), reported: false })
        .then(data => res.redirect(`/b/${board}/`))
        // .then(data => res.json(data.ops[0]))
        .catch(error => res.json({ error }))
    })
    .put((req, res) => {
      const { board } = req.params;
      const { thread_id, reply_id } = req.body;
      db.collection('replies').findOneAndUpdate(
        { _id: new ObjectId(reply_id) },
        {
          $set: { reported: true }
        }
      )
        .then(data => res.json('success'))
        .catch(error => res.json('error'))
    })
    .delete((req, res) => {
      const { board } = req.params;
      const { reply_id, delete_password } = req.body;

      db.collection('replies').findOne({ _id: new ObjectId(reply_id) })
        .then(data => {
          if (!data) return res.json('error');
          if (data.delete_password !== delete_password) return res.json('incorrect password');
          db.collection('replies').remove({ _id: new ObjectId(reply_id) })
            .then(data => res.json('success'))
            .catch(error => res.json('error'))
        })
        .catch(error => res.json('error'));
    })
};
