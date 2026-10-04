from datetime import datetime
from typing import List, Optional
from os_engine.metrics import save_system_metrics

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from os_engine.process import Process
from os_engine.scheduler import get_scheduler
from os_engine.os_database import (
    create_query,
    create_process,
    update_process_result,
    save_scheduling_result
)


router = APIRouter(
    prefix="/schedule",
    tags=["Scheduling"]
)


class ProcessInput(BaseModel):
    process_id: int
    arrival_time: int
    burst_time: int
    priority: int = 0


class SchedulingRequest(BaseModel):
    query_text: str
    algorithm: str
    processes: List[ProcessInput]
    priority: int = 0
    time_quantum: Optional[int] = None


@router.post("/")
def schedule_processes(request: SchedulingRequest):

    try:

        algorithm = request.algorithm.upper()

        # --------------------------------
        # 1. Create query
        # --------------------------------

        query_id = create_query(
            query_text=request.query_text,
            algorithm=algorithm,
            priority=request.priority
        )

        # --------------------------------
        # 2. Create Python processes
        # --------------------------------

        processes = [
            Process(
                process_id=p.process_id,
                arrival_time=p.arrival_time,
                burst_time=p.burst_time,
                priority=p.priority
            )
            for p in request.processes
        ]

        # --------------------------------
        # 3. Get scheduler
        # --------------------------------

        scheduler = get_scheduler(
            algorithm,
            request.time_quantum
        )

        # --------------------------------
        # 4. Create database processes
        # --------------------------------

        base_time = datetime.now()

        database_process_ids = {}

        for process in processes:

            database_id = create_process(
                query_id=query_id,
                process=process,
                base_time=base_time
            )

            database_process_ids[
                process.process_id
            ] = database_id

        # --------------------------------
        # 5. Run scheduler
        # --------------------------------

        results = scheduler.schedule(processes)

        # --------------------------------
        # 6. Save results
        # --------------------------------

        for process in results:

            database_id = database_process_ids[
                process.process_id
            ]

            update_process_result(
                database_process_id=database_id,
                process=process,
                base_time=base_time
            )

            save_scheduling_result(
                database_process_id=database_id,
                process=process,
                algorithm=algorithm,
                base_time=base_time
            )

        metrics = save_system_metrics(
            processes=results
        )

        # --------------------------------
        # 7. Return response
        # --------------------------------

        return {
            "query_id": query_id,
            "algorithm": algorithm,
            "results": [
                {
                    "process_id": process.process_id,
                    "arrival_time": process.arrival_time,
                    "burst_time": process.burst_time,
                    "priority": process.priority,
                    "start_time": process.start_time,
                    "completion_time": process.completion_time,
                    "waiting_time": process.waiting_time,
                    "turnaround_time": process.turnaround_time,
                    "response_time": process.response_time
                }
                for process in results
            ],
            "system_metrics": metrics
        }

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )