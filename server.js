const express = require('express');
const bodyParser = require('body-parser');
const mongo = require('mongoose');
const dbox = require('dropbox');
const dbx = new dbox.Dropbox({ accessToken: '4jQ0LLOKtgwAAAAAAAAAAU_NyMgE15XWXB8vyI_dwyMt8QcAU1IviNR9a_TqlXQt' });
const uuid = require('uuid').v4;

(function connect() {
    return new Promise((resolve, reject) => {
        mongo.connect('mongodb+srv://Catanna:jacoepi4@cluster0.bev5u.mongodb.net/JTStudioDB?retryWrites=true&w=majority', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        const db = mongo.connection;
        db.on('error', err => {
            console.error('Database error: ', err.message);
            reject(err.message);
        });
        db.on('open', () => {
            console.log('Database connected');
            resolve();
        });
    });

})();

const port = process.env.PORT || 3030;
const app = express();
app.use(bodyParser({ limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

const Schema = mongo.Schema;

const UserSchema = new Schema({
    name: { type: String },
    email: { type: String },
    password: { type: String },
    phone: { type: String },
    address: { type: String },
    img: { type: String },
    admin: { type: Boolean }
}, { versionKey: false });

const CommentsSchema = new Schema({
    userID: { type: String },
    date: { type: Date },
    msg: { type: String },
    status: { type: String },
    likes: { type: Array }
}, { versionKey: false });

const MessagesSchema = new Schema({
    name: { type: String },
    email: { type: String },
    msg: { type: String }
}, { versionKey: false });

const AlbumsSchema = new Schema({
    albumName: { type: String },
    category: { type: String },
    images: { type: Array },
    userID: { type: String }
}, { versionKey: false });

const albumsModel = mongo.model('albums', AlbumsSchema, 'albums');
const commentsModel = mongo.model('comments', CommentsSchema, 'comments');
const messageModel = mongo.model('message', MessagesSchema, 'message');
const model = mongo.model('users', UserSchema, 'users');

app.post('/api/SaveUser', function (req, res) {
    model.find({}, function (err, data) {
        let admin;
        if (err) {
            res.send(err);
        } else {
            if (data.length === 0) {
                admin = true;
            } else {
                admin = false;
            }
            model.find({ email: req.body.email }, function (errEmail, dataEmail) {
                if (errEmail) {
                    res.send(errEmail);
                } else {
                    if (dataEmail.length) {
                        res.send({
                            regEmail: 'Електронната поща вече е регистрирана!'
                        })
                    } else {
                        const mod = new model({ ...req.body, admin });
                        mod.save(function (err, data) {
                            if (err) {
                                res.send(err);
                            } else {
                                res.send({});
                            }
                        });
                    }
                }
            })

        }
    });
});
app.post('/api/UpdateUser', function (req, res) {
    model.updateOne({ _id: req.body._id }, req.body, {}, function (err, data) {
        if (err) {
            res.send(err);
        } else {
            res.send(data);
        }
    })
});

app.post('/api/deleteUser', function (req, res) {
    model.deleteOne({ _id: req.body.userID }, function (err) {
        if (err) {
            res.send(err);
        } else {
            res.send({ data: 'Record has been Deleted..!!' });
        }
    });
});

app.post('/api/login', function (req, res) {
    model.find(req.body, function (err, data) {
        if (err) {
            res.send(err);
        } else {
            if (data[0]) {
                res.send({ userID: data[0]._id, isAdmin: data[0].admin });
            }
        }
    });
});

app.get('/api/loadUsers', function (req, res) {
    model.find({}, function (err, data) {
        if (err) {
            res.send(err);
        } else {
            res.send(data.map(({ _id, name }) => ({ userID: _id, name })));
        }
    });
});
app.get('/api/loadUsers/:userID', function (req, res) {
    model.findById(req.params.userID, function (err, data) {
        if (err) {
            res.send(err);
        } else {
            res.send(data);
        }
    });
});

app.post('/api/saveMessage', function (req, res) {
    const mess = new messageModel(req.body);
    mess.save(function (err, data) {
        if (err) {
            res.send(err);
        } else {
            res.send({ data: 'Record has been Inserted..!!' });
        }
    });
});

app.post('/api/loadMessages', function (req, res) {
    messageModel.find({}, function (err, data) {
        if (err) {
            res.send(err);
        } else {
            res.send(data);
        }
    });
});

app.post('/api/saveComment', function (req, res) {
    const mod = new commentsModel({
        ...req.body,
        status: 'pending'
    });
    mod.save(function (err, data) {
        if (err) {
            res.send(err);
        } else {
            res.send({ data: 'Record has been Inserted..!!' });
        }
    });
});

app.get('/api/loadComment/:userID', function (req, res) {
    model.findById(req.params.userID, function (userErr, userData) {
        if (userErr) {
            res.send(userErr);
        } else {
            const username = userData.name;
            commentsModel.find({ userID: req.params.userID }, function (err, data) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(data.map(c => ({
                        date: c.date,
                        msg: c.msg,
                        _id: c._id,
                        name: username
                    })));
                }
            });
        }
    })

});

app.post('/api/updateComment', function (req, res) {
    let updateData;
    if (req.body.text) {
        updateData = {
            msg: req.body.text,
            status: 'pending'
        };
    } else if (req.body.status) {
        updateData = {
            status: req.body.status
        };
    }
    commentsModel.updateOne({ _id: req.body.commentID }, updateData, {}, function (err, data) {
        if (err) {
            res.send(err);
        } else {
            res.send(data);
        }
    })
});

app.post('/api/likes', function (req, res) {
    commentsModel.updateOne({ _id: req.body.commentID }, { likes: req.body.likes }, {}, function (err, data) {
        if (err) {
            res.send(err);
        } else {
            res.send(data);
        }
    })
});
app.post('/api/deleteComment', function (req, res) {
    commentsModel.deleteOne({ _id: req.body.commentID }, {}, function (err) {
        if (err) {
            res.send(err);
        } else {
            res.send({ data: 'Record has been Deleted..!!' });
        }
    });
});

app.get('/api/loadComments/:status', function (req, res) {
    model.find({}, function (err, data) {
        if (err) {
            res.send(err);
        } else {
            const users = data.reduce((acc, curr) => {
                acc[curr._id] = curr.name;
                return acc;
            }, {});
            commentsModel.find({ status: req.params.status }, function (err, data) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(data.map(({ date, msg, userID, _id, status, likes }) => ({
                        date,
                        msg,
                        name: users[userID] || 'Деактивиран профил',
                        _id,
                        status,
                        likes
                    })));
                }
            });
        }
    })
});

app.get('/api/loadImages', function (req, res) {
    albumsModel.find({}, function (err, data) {
        if (err) {
            res.send(err);
        } else {
            const images = data.reduce((acc, e) => {
                return acc.concat(e.images);
            }, []);

            let viewImg = [];
            function getRandom(min, max) {
                min = Math.ceil(min);
                max = Math.floor(max);
                return Math.floor(Math.random() * (max - min + 1)) + min;
            }
            for (let index = 0; index < 9; index++) {
                const num = getRandom(0, images.length - 1);
                let el = images.splice(num, 1);
                viewImg = viewImg.concat(el);
            }
            res.send(viewImg);
        }
    });
});

app.post('/api/loadAlbums', function (req, res) {
    albumsModel.find(req.body, async function (err, data) {
        if (err) {
            res.send(err);
        } else {
            const albums = await data.map(async (a) => {
                const img = a.images[0];
                const file = await dbx.filesDownload({ path: '/' + img });
                return {
                    img: file.result.fileBinary.toString(),
                    albumID: a._id
                };
            })
            const returnData = await Promise.all(albums);
            res.send(returnData);
        }
    });
});

app.get(`/api/loadAlbums/:albumID`, function (req, res) {
    albumsModel.findById(req.params.albumID, async function (err, data) {
        if (err) {
            res.send(err);
        } else {
            const albums = await data.images.map(async (a) => {
                return dbx.filesDownload({ path: '/' + a });
            })
            const returnData = await Promise.all(albums);
            res.send(returnData.map(i => i.result.fileBinary.toString()));
        }
    });
});

app.post('/api/saveAlbums', function (req, res) {
    albumsModel.find({ albumName: req.body.albumName }, async function (err, data) {
        if (err) {
            res.send(err);
        } else {
            if (data.length === 0) {
                const fileNames = await req.body.images.reduce(async (acc, curr) => {
                    const accAwaited = await acc;
                    const fileName = uuid();
                    await dbx.filesUpload({ path: '/' + fileName, contents: curr });
                    accAwaited.push(fileName);
                    return accAwaited;
                }, []);
                const dataMod = new albumsModel({ ...req.body, images: fileNames });
                dataMod.save(function (err, data) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send({ data: 'Record has been Inserted..!!' });
                    }
                });
            }
        }
    });

});

app.post('/api/deleteAlbum', function (req, res) {
    const _id = req.body.albumID;
    albumsModel.findById(_id, async function (err, data) {
        if (err) {
            res.send(err);
        } else {
            const paths = data.images.map((img) => ({ path: '/' + img }));
            await dbx.filesDeleteBatch({
                entries: paths
            });
            albumsModel.deleteOne({ _id }, {}, function (err) {
                if (err) {
                    res.send(err);
                } else {
                    res.send({ data: 'Record has been Deleted..!!' });
                }
            });
        }
    })
});

app.listen(port, function () {
    console.log(`App listening on ${port}`);
});