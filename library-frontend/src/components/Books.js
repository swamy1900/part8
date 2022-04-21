import React, { useState } from 'react';

const Books = props => {
  const [fillter, setFillter] = useState('');
  if (!props.show) {
    return null;
  }
  const books = props.books.data.allBooks;
  const genres = [];
  const handleClick = genre => {
    setFillter(genre);
  };
  books.forEach(book => {
    book.genres.forEach(genre => {
      if (!genres.includes(genre)) genres.push(genre);
    });
  });
  if (props.books.loading) return <div>loading...</div>;
  const filteredBooks = () => {
    if (!fillter) return books;
    return books.filter(book => book.genres.includes(fillter));
  };
  return (
    <div>
      <h2>books</h2>

      <table>
        <tbody>
          <tr>
            <th />
            <th>author</th>
            <th>published</th>
          </tr>
          {filteredBooks().map(a => (
            <tr key={a.title}>
              <td>{a.title}</td>
              <td>{a.author.name}</td>
              <td>{a.published}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {genres.map(g => (
        <button key={g} onClick={() => handleClick(g)}>
          {g}
        </button>
      ))}
      <button onClick={() => setFillter('')}>all genres</button>
    </div>
  );
};
export default Books;