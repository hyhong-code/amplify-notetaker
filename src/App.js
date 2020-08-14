import React, { Fragment, useEffect, useState } from "react";
import { Auth, API, graphqlOperation } from "aws-amplify";
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

  // Change notes list when switching user
  useEffect(() => {
    fetchAllNotes();
  }, [user]);

  useEffect(() => {
    let createNoteListener;
    let deleteNoteListener;
    let updateNoteListener;
    (async () => {
      createNoteListener = API.graphql(
        graphqlOperation(onCreateNote, {
          owner: (await Auth.currentAuthenticatedUser()).username,
        })
      ).subscribe({
        next: (noteData) => {
          const newNote = noteData.value.data.onCreateNote;
          setNotes((prev) => [newNote, ...prev]);
        },
      });
      deleteNoteListener = API.graphql(
        graphqlOperation(onDeleteNote, {
          owner: (await Auth.currentAuthenticatedUser()).username,
        })
      ).subscribe({
        next: (noteData) => {
          const deletedNote = noteData.value.data.onDeleteNote;
          setNotes((prev) => prev.filter((note) => note.id !== deletedNote.id));
        },
      });
      updateNoteListener = API.graphql(
        graphqlOperation(onUpdateNote, {
          owner: (await Auth.currentAuthenticatedUser()).username,
        })
      ).subscribe({
        next: (noteData) => {
          const updatedNote = noteData.value.data.onUpdateNote;
          setNotes((prev) =>
            prev.map((note) =>
              note.id === updatedNote.id ? updatedNote : note
            )
          );
        },
      });
    })();
    return () => {
      createNoteListener.unsubscribe();
      deleteNoteListener.unsubscribe();
      updateNoteListener.unsubscribe();
    };
  }, []);

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
      if (isEditing()) {
        input = { id: editId, note };
        await API.graphql(graphqlOperation(updateNote, { input }));
        setEditId(null);
      } else {
        input = { note };
        await API.graphql(graphqlOperation(createNote, { input }));
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
            onChange={(evt) => setNote(evt.target.value)}
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
