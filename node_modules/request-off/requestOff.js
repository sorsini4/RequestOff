class requestOff {
    constructor(userName, startDate, endDate, hours) {
        try {
            this.userName = userName;
            this.startDate = startDate;
            this.endDate = endDate;
            this.hours = hours;
        }
        catch(err) {
            console.log(err);
        }
    }

}

module.exports = requestOff;
