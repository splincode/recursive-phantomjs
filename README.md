# Background rendering of pages 

[![Greenkeeper badge](https://badges.greenkeeper.io/splincode/recursive-phantomjs.svg)](https://greenkeeper.io/)

```
$ npm install
$ npm test
```

See config.json

# Current problem
![Problem](problem.png "Problem")


# Trace problem

```
$ node --trace_gc test # or
$ node --prof --track_gc_object_stats --trace_gc_verbose --log_timer_events test # open chrome://tracing/
```