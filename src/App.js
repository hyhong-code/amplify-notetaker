import React, { Fragment, useEffect, useState } from "react";
import { API, graphqlOperation } from "aws-amplify";
import { AmplifyAuthenticator, AmplifyGreetings } from "@aws-amplify/ui-react";
import { AuthState, onAuthUIStateChange } from "@aws-amplify/ui-components";

import { createNote, deleteNote, updateNote } from "./graphql/mutations";
import { listNotes } from "./graphql/queries";
import {
  onCreateNote,
  onDeleteNote,
  onUpdateNote,
} from "./graphql/subscriptions";

const App = () => {
  const [auth, setAuth] = useState(null);
  const [user, setUser] = useState(null);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([]);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    return onAuthUIStateChange((nextAuthState, authData) => {
      setAuth(nextAuthState);
      setUser(authData);
    });
  }, []);

  const fetchAllNotes = async () => {
    try {
      const res = await API.graphql(graphqlOperation(listNotes));
      setNotes(res.data.listNotes.items);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchAllNotes();
    const createNoteListener = API.graphql(
      graphqlOperation(onCreateNote)
    ).subscribe({
      next: (noteData) => {
        const newNote = noteData.value.data.onCreateNote;
        setNotes((prev) => [newNote, ...prev]);
      },
    });
    const deleteNoteListener = API.graphql(
      graphqlOperation(onDeleteNote)
    ).subscribe({
      next: (noteData) => {
        const deletedNote = noteData.value.data.onDeleteNote;
        setNotes((prev) => prev.filter((note) => note.id !== deletedNote.id));
      },
    });
    const updateNoteListener = API.graphql(
      graphqlOperation(onUpdateNote)
    ).subscribe({
      next: (noteData) => {
        const updatedNote = noteData.value.data.onUpdateNote;
        setNotes((prev) =>
          prev.map((note) => (note.id === updatedNote.id ? updatedNote : note))
        );
      },
    });
    return () => {
      createNoteListener.unsubscribe();
      deleteNoteListener.unsubscribe();
      updateNoteListener.unsubscribe();
    };
  }, []);

  const handleChange = (evt) => {
    setNote(evt.target.value);
  };

  const isEditing = () => {
    if (editId && !!notes.find((note) => note.id === editId)) {
      return true;
    }
    return false;
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    try {
      let input;
      let res;
      if (isEditing()) {
        input = { id: editId, note };
        res = await API.graphql(graphqlOperation(updateNote, { input }));
        // setNotes((prev) =>
        //   prev.map((note) => (note.id === editId ? res.data.updateNote : note))
        // );
        setEditId(null);
      } else {
        input = { note };
        res = await API.graphql(graphqlOperation(createNote, { input }));
        // setNotes((prev) => [res.data.createNote, ...prev]);
      }
      setNote("");
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const input = { id };
      await API.graphql(graphqlOperation(deleteNote, { input }));
      // setNotes((prev) => prev.filter((note) => note.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  return auth === AuthState.SignedIn && user ? (
    <Fragment>
      <AmplifyGreetings username={user.username} />
      <div className="flex flex-column items-center justify-center pa3 bg-washed-red">
        <h1 className="code f2-l">Amplify Notetaker</h1>
        {/* Note Form */}
        <form className="mb3" onSubmit={handleSubmit}>
          <input
            type="text"
            className="pa2 f4"
            placeholder={isEditing() ? "Update your note" : "Write your note"}
            onChange={handleChange}
            value={note}
          />
          <button
            className="pa2 f4"
            type="submit"
            style={{ cursor: "pointer", marginLeft: "0.5rem" }}
          >
            {isEditing() ? "Update note" : "Add note"}
          </button>
        </form>
        {/* Notes List */}
        {notes.map((note) => (
          <div key={note.id} className="flex items-center">
            <li
              className="list pa1 f3"
              style={{ cursor: "pointer" }}
              onClick={() => setEditId(note.id)}
            >
              {note.note}
            </li>
            <button
              className="bg-transparent bn f4"
              onClick={() => handleDelete(note.id)}
              style={{ cursor: "pointer" }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </Fragment>
  ) : (
    <AmplifyAuthenticator />
  );
};

export default App;
