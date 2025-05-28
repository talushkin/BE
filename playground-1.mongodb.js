/* global use, db */
// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use('recipes');

// Search for documents in the current collection.
db.getCollection('recipes')
  .find(
    {
      _id: ObjectId("68233a04beb61ea84669cf75") // Corrected the syntax for ObjectId
    },
    {
      /*
      * Projection
      * _id: 0, // exclude _id
      * fieldA: 1 // include field
      */
    }
  )
  .sort({
    /*
    * fieldA: 1 // ascending
    * fieldB: -1 // descending
    */
  });