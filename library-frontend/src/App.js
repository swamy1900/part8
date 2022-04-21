import React, { useState, useEffect } from 'react';
import Authors from './components/Authors';
import Books from './components/Books';
import NewBook from './components/NewBook';
import LoginForm from './components/LoginForm';
import Recommended from './components/Recommended';

import { gql } from 'apollo-boost';
import {
  useQuery,
  useMutation,
  useApolloClient,
  useSubscription
} from '@apollo/react-hooks';
const BOOK_DETAILS = gql`
  fragment BookDetails on Book {
    id
    title
    published
    author {
      name
    }
    genres
  }
`;
const ALL_AUTHORS = gql`
  {
    allAuthors {
      name
      born
      bookCount
    }
  }
`;
const ALL_BOOKS = gql`
  {
    allBooks {
      ...BookDetails
    }
  }
  ${BOOK_DETAILS}
`;
const CREATE_BOOK = gql`
  mutation createBook(
    $title: String!
    $author: String!
    $published: Int!
    $genres: [String]
  ) {
    addBook(
      title: $title
      author: $author
      published: $published
      genres: $genres
    ) {
      id
      title
      author {
        name
      }
      published
      genres
    }
  }
`;
const EDIT_BIRTHYEAR = gql`
  mutation editBirthyear($name: String!, $year: Int!) {
    editAuthor(name: $name, setBornTo: $year) {
      name
      born
    }
  }
`;
const LOGIN = gql`
  mutation login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      value
    }
  }
`;
const BOOK_ADDED = gql`
  subscription {
    bookAdded {
      ...BookDetails
    }
  }
  ${BOOK_DETAILS}
`;
const App = () => {
  const [token, setToken] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [page, setPage] = useState('authors');
  const authors = useQuery(ALL_AUTHORS);
  const books = useQuery(ALL_BOOKS);
  const client = useApolloClient();
  useEffect(() => {
    if (localStorage.getItem('library-user-token'))
      setToken(localStorage.getItem('library-user-token'));
  }, []);
  const updateCacheWith = addedBook => {
    const includedIn = (set, object) => set.map(p => p.id).includes(object.id);
    const dataInStore = client.readQuery({ query: ALL_BOOKS });
    console.log('DAS ', dataInStore);  
    if (!includedIn(dataInStore.allBooks, addedBook)) {
      dataInStore.allBooks = [...dataInStore.allBooks, addedBook];
      console.log('PUSHING');
      client.writeQuery({
        query: ALL_BOOKS,
        data: dataInStore
      });
      client.queryManager.broadcastQueries();
    }
  };
  useSubscription(BOOK_ADDED, {
    onSubscriptionData: ({ subscriptionData }) => {
      console.log(subscriptionData);
      updateCacheWith(subscriptionData.data.bookAdded);
    }
  });
  const handleError = error => {
    console.log('ERROR ', error);
    setErrorMessage(error.message);
    errorNotification();
  };
  const [addBook] = useMutation(CREATE_BOOK, {
    onError: handleError,
    update: (store, response) => {
      updateCacheWith(response.data.addBook);
    }
  });
  const [editBirthyear] = useMutation(EDIT_BIRTHYEAR, {
    onError: handleError,
    refetchQueries: [{ query: ALL_AUTHORS }]
  });
  const [login] = useMutation(LOGIN, {
    onError: handleError
  });
  const logout = () => {
    setToken(null);
    localStorage.clear();
    client.resetStore();
  };
  const errorNotification = () =>
    errorMessage && <div style={{ color: 'red' }}>{errorMessage}</div>;
  return (
    <div>
      {errorNotification()}
      <div>
        <button onClick={() => setPage('authors')}>authors</button>
        <button onClick={() => setPage('books')}>books</button>
        {token && <button onClick={() => setPage('add')}>add book</button>}
        {token && (
          <button onClick={() => setPage('recommended')}>recommended</button>
        )}
        {token && <button onClick={() => logout()}>logout</button>}
        {!token && <button onClick={() => setPage('login')}>login</button>}
      </div>
      <Authors
        show={page === 'authors'}
        authors={authors}
        editBirthyear={editBirthyear}
        token={token}
      />
      <Books show={page === 'books'} books={books} />
      <NewBook show={page === 'add'} addBook={addBook} />
      <Recommended show={page === 'recommended'} books={books} />
      <LoginForm
        show={page === 'login'}
        login={login}
        setToken={token => setToken(token)}
      />
    </div>
  );
};
export default App;