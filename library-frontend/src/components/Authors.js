import React, { useState } from 'react';

  const Authors = props => {
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const submit = async e => {
    e.preventDefault();
    console.log('change author birth...');
    const birthyear = parseInt(year);
    props.editBirthyear({
      variables: { name, year: birthyear }
    });
    setName('');
    setYear('');
  };

  if (!props.show) {
    return null;
  }
  console.log(props.token);
  const authors = props.authors.data.allAuthors;
  if (props.authors.loading) return <div>loading...</div>;
  return (
    <div>
      <h2>authors</h2>
      <table>
        <tbody>
          <tr>
            <th />
            <th>born</th>
            <th>books</th>
          </tr>
          {authors.map(a => (
            <tr key={a.name}>
              <td>{a.name}</td>
              <td>{a.born}</td>
              <td>{a.bookCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {props.token && (
        <>
          <h2>Set Birthyear</h2>
          <form onSubmit={submit}>
            <label>name</label>
            <input
              value={name}
              onChange={({ target }) => setName(target.value)}
            />
            <label>year</label>
            <input
              type="number"
              value={year}
              onChange={({ target }) => setYear(target.value)}
            />
            <button type="submit">submit</button>
          </form>
          <form onSubmit={submit}>
            <label>name</label>
            <select
              value={name}
              onChange={({ target }) => setName(target.value)}
            >
              {/* <option value="grapefruit">Grapefruit</option>
          <option value="lime">Lime</option> */}
              {authors.map(a => (
                <option value={a.name} key={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
            <label>year</label>
            <input
              type="number"
              value={year}
              onChange={({ target }) => setYear(target.value)}
            />
            <button type="submit">submit</button>
          </form>
        </>
      )}
    </div>
  );
};
export default Authors;