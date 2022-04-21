const {
    ApolloServer,
    UserInputError,
    AuthenticationError,
    gql
  } = require('apollo-server');
  require('dotenv').config()
  const { PubSub } = require('apollo-server');
  const mongoose = require('mongoose');
  const Author = require('./models/author');
  const Book = require('./models/book');
  const User = require('./models/user');
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET;
  const MONGODB_URI = process.env.MONGODB_URI;
  mongoose.set('useFindAndModify', false);
  const pubsub = new PubSub()
  console.log('connecting to', MONGODB_URI);
  mongoose
    .connect(MONGODB_URI, { useNewUrlParser: true })
    .then(() => {
      console.log('connected to MongoDB');
    })
    .catch(error => {
      console.log('error connection to MongoDB:', error.message);
    });
  const typeDefs = gql`
    type Book {
      title: String!
      published: Int!
      author: Author!
      genres: [String!]!
      id: ID!
    }
    type Author {
      name: String!
      born: Int
      id: ID!
      bookCount: Int!
    }
    type User {
      username: String!
      favoriteGenre: String!
      id: ID!
    }
    type Token {
      value: String!
    }
    type Query {
      bookCount: Int!
      authorCount: Int!
      allBooks(author: String, genre: [String]): [Book!]
      allAuthors: [Author!]!
      me: User
    }
    type Mutation {
      addBook(
        title: String!
        published: Int!
        author: String!
        genres: [String]
      ): Book
      addAuthor(name: String!, born: Int): Author
      editAuthor(name: String!, setBornTo: Int!): Author
      createUser(username: String!, favoriteGenre: String!): User
      login(username: String!, password: String!): Token
    }
    type Subscription {
      bookAdded: Book!
    }
  `;
  const resolvers = {
    Query: {
      bookCount: () => {
        return Book.collection.countDocuments();
      },
      authorCount: () => Author.collection.countDocuments(),
      allBooks: (root, args) => {
        console.log(args);
        if (!args.author && !args.genre) {
          return Book.find({}).populate('author', {
            name: 1,
            id: 1,
            born: 1
          });
        }
        if (args.genre && !args.author) {
          let resultBooks = Book.find({ genres: { $in: args.genre } }).populate(
            'author',
            {
              name: 1,
              id: 1,
              born: 1
            }
          );
          return resultBooks;
        }
      },
      allAuthors: () => Author.find({}),
      me: (root, args, context) => {
        return context.currentUser;
      }
    },
    Author: {
      bookCount: root => {
        const books = Book.find({ author: root.id });
        return books.countDocuments();
      }
    }, 
    Mutation: {
      addBook: async (root, args, context) => {
        const author = await Author.findOne({ name: args.author });
        const book = new Book({ ...args }); 
        book.author = author;
        const currentUser = context.currentUser;
        if (!currentUser) {
          throw new AuthenticationError('not authenticated');
        } 
        try {
          book.save();
        } catch (error) {
          throw new UserInputError(error.message, {
            invalidArgs: args
          });
        }
        pubsub.publish('BOOK_ADDED', { bookAdded: book })
        return book;
      },
      addAuthor: (root, args) => {
        const author = new Author({ ...args });
        try {
          author.save();
        } catch (error) {
          throw new UserInputError(error.message, {
            invalidArgs: args
          });
        }
        return author;
      },
      editAuthor: async (root, args, context) => {
        const author = await Author.findOne({ name: args.name });
        if (!author) {
          return null;
        }
        author.born = args.setBornTo;
        const currentUser = context.currentUser;
        if (!currentUser) {
          throw new AuthenticationError('not authenticated');
        }
        try {
          author.save();
        } catch (error) {
          throw new UserInputError(error.message, {
            invalidArgs: args
          });
        }
        return author;
      },
      createUser: (root, args) => {
        const user = new User({
          username: args.username,
          favoriteGenre: args.favoriteGenre
        });
        return user.save().catch(error => {
          throw new UserInputError(error.message, {
            invalidArgs: args
          });
        });
      },
      login: async (root, args) => {
        const user = await User.findOne({ username: args.username });
  
        if (!user || args.password !== 'secred') {
          throw new UserInputError('wrong credentials');
        }
        const userForToken = {
          username: user.username,
          id: user._id
        };
        return { value: jwt.sign(userForToken, JWT_SECRET) };
      }
    },
    Subscription: {
      bookAdded: {
        subscribe: () => pubsub.asyncIterator(['BOOK_ADDED'])
      },
    },
  };
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }) => {
      const auth = req ? req.headers.authorization : null;
      if (auth && auth.toLowerCase().startsWith('bearer ')) {
        const decodedToken = jwt.verify(auth.substring(7), JWT_SECRET);
        const currentUser = await User.findById(decodedToken.id);
        return { currentUser };
      }
    }
  });
  server.listen().then(({ url }) => {
    console.log(`Server ready at ${url}`);
  });