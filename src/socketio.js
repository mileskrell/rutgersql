class SocketAPI {
    constructor(server, io, port, root, redis){
        // will cache api results in local redis object
        this.redis = redis;
        server.listen(port , () => {
            console.log('socketio listening  http://127.0.0.1:' + port)
        });

        io.on("connection", (socket) => {
          // use this one just to get all the data in one shot. vehiclesByName takes 17s to complete when getting all routes. Needs major rewrite eventually
            setInterval(async () => {
                    const data = await root.routesByName({});
                    socket.emit("data", data);
            }, 1000 * 7);

            io.on('routes', (socket) => {
                setInterval(() => {
                    root.routes()
                        .then((res) =>socket.emit('routes',res))
                        .catch((err) => console.log(err));
                }, 1000);
            });

            io.on('vehicles', (socket) => {
                setInterval(() => {
                    root.vehicles()
                        .then((res) => socket.emit('vehicles', res))
                        .catch((err) => console.log(err));
                }, 1000);
            });

            io.on('stops', (socket) => {
                setInterval(() => {
                    root.stops()
                        .then((res) => socket.emit('stops', res))
                        .catch((err) => console.log(err));
                }, 1000);
            })

        });
    }
}

module.exports = SocketAPI;
