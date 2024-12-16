import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Location } from '@angular/common';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-ticket-booking',
  standalone: false,
  templateUrl: './ticket-booking.component.html',
  styleUrls: ['./ticket-booking.component.css']
})
export class TicketBookingComponent implements OnInit {
  userId!: string;
  eventId!: string;
  userName: string = '';
  event: any;
  numberOfTickets: number = 1;
  baseCost: number = 0; // Base cost before GST
  gstAmount: number = 0; // GST amount
  totalCost: number = 0; // Total cost including GST
  userProfile: any;
  gstRate: number = 18; // GST rate in percentage

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private sessionService: SessionService,
    private location: Location
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.eventId = params.get('eventid') || '';
      if (this.eventId) {
        this.fetchEventDetails(this.eventId);
      } else {
        console.error('No event ID found in route parameters');
        this.router.navigate(['/login']);
      }
    });

    const retrievedId = this.sessionService.getItem('userId');
    if (retrievedId) {
      this.userId = retrievedId; 
        this.getUserProfile(this.userId);
      } else {
        console.error('No user ID found in route parameters');
        this.router.navigate(['/login']);
      }
  }

  getUserProfile(userId: string): void {
    this.authService.getProfileById(userId).subscribe(
      (response) => {
        this.userProfile = response;
        this.userName = response.fullName;
      },
      (error) => {
        console.error('Error fetching user profile', error);
        this.router.navigate(['/login']);
      }
    );
  }

  fetchEventDetails(eventId: string): void {
    this.authService.fetchEventDetails(this.eventId).subscribe(
      (response) => {
        this.event = response;
        console.log('Event details fetched:', this.event);
        this.updateTotalCost();
      },
      (error) => {
        console.error('Error fetching event details:', error);
      }
    );
  }

  updateTotalCost() {
    // Calculate base cost and GST amount
    this.baseCost = this.numberOfTickets * this.event.ticketPrice;
    this.gstAmount = (this.baseCost * this.gstRate) / 100;
    this.totalCost = this.baseCost + this.gstAmount;
  }

  cancelBooking() {
    this.router.navigate([`/userdashboard/eventdetails`]);
  }

  proceedToConfirm() {
    const bookingDetails = {
      userId: this.userId,
      eventId: this.eventId,
      numberOfTickets: this.numberOfTickets,
      baseCost: this.baseCost,
      gstAmount: this.gstAmount,
      totalAmount: this.totalCost,
      eventName: this.event.eventName,
      eventDate: this.event.eventDate,
      eventTime: this.event.eventTime,
      ticketPrice: this.event.ticketPrice,
      eventLocation: this.event.location,
      bookingDate: new Date().toISOString(),
    };

    // Save booking details
    this.authService.saveBooking(bookingDetails).subscribe(
      (response: any) => {
        console.log(bookingDetails);
        alert('Booking saved successfully');

        // Update event register count after booking is saved
        this.authService.registerTickets(this.eventId, this.numberOfTickets).subscribe(
          (updateResponse: any) => {
            console.log('Register count updated successfully', updateResponse);

            // Navigate to e-ticket generation
            this.router.navigate([`/userdashboard/eventdetails/${this.eventId}/ticketbooking/eticket`], {
              state: { event: this.event, tickets: this.numberOfTickets },
            });
          },
          (updateError) => {
            console.error('Error updating register count:', updateError);
            alert('Booking saved, but there was an error updating the event details.');
          }
        );
      },
      (error) => {
        console.log(bookingDetails);
        console.error('Error saving booking:', error);
        alert('Unable to save booking details. Please try again.');
      }
    );
  }

  onBack(): void {
    this.location.back();
  }
}
