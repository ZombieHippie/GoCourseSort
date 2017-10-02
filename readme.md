# GoCourseSort

A Go websocket server and [search ranking algorithm for courses](https://github.com/ZombieHippie/GoCourseSort/blob/53a75615096d1e899a0be1489798e317711eeb5e/database.go#L149-L242) with an Angular powered user interface.

## Problem

Missouri State is very good at keeping all of [their course catalogs online]("See Computer Science department catalog" http://www.missouristate.edu/registrar/catalog/courses_cs.htm) and up to date, but it becomes burdensome to use their online catalogs when you must keep track of many many courses at a time while planning your four years.

Questions like "What course was my professor describing with  'Animation' in the title?" are very difficult to answer without knowing the department of the course, because [every catalog page is per department]("See all the different departments with catalogs" http://www.missouristate.edu/registrar/catalog/coursesearch.htm).

So, when you must track down around a hundred different courses and what their prerequisites are, this can be burdensome with the limited tools available.

Therefore, I created this small tool, early in my career to help make tracking down courses easier for myself.

## Screenshots

![Search interface](/screenshots/02-interface-search.PNG)
![Department page](/screenshots/02-department-page.PNG)
![Hover over interface](/screenshots/02-hover-over-course.PNG)
![Individual course page](/screenshots/02-individual-course-page.PNG)

With browser storage caching (if supported on device)
![LocalStorage usage](/screenshots/02-local-storage-usage.PNG)
