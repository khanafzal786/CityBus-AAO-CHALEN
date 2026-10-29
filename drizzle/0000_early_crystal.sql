CREATE TABLE `auditLog` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`action` text NOT NULL,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `busLocations` (
	`id` text PRIMARY KEY NOT NULL,
	`busId` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`speed` real NOT NULL,
	`timestamp` text NOT NULL,
	`mode` text NOT NULL,
	FOREIGN KEY (`busId`) REFERENCES `buses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `buses` (
	`id` text PRIMARY KEY NOT NULL,
	`operatorId` text NOT NULL,
	`busNumber` text NOT NULL,
	`registrationNumber` text NOT NULL,
	`routeId` text,
	`capacity` integer NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`currentLatitude` real,
	`currentLongitude` real,
	`lastLocationUpdate` text,
	`locationMode` text DEFAULT 'DEMO' NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`operatorId`) REFERENCES `operators`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`routeId`) REFERENCES `routes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `buses_busNumber_unique` ON `buses` (`busNumber`);--> statement-breakpoint
CREATE UNIQUE INDEX `buses_registrationNumber_unique` ON `buses` (`registrationNumber`);--> statement-breakpoint
CREATE TABLE `contactMessages` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'NEW' NOT NULL,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fares` (
	`id` text PRIMARY KEY NOT NULL,
	`routeId` text NOT NULL,
	`sourceStopId` text NOT NULL,
	`destinationStopId` text NOT NULL,
	`fareAmount` real NOT NULL,
	FOREIGN KEY (`routeId`) REFERENCES `routes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sourceStopId`) REFERENCES `stops`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`destinationStopId`) REFERENCES `stops`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fare_pair_unique` ON `fares` (`routeId`,`sourceStopId`,`destinationStopId`);--> statement-breakpoint
CREATE TABLE `favouriteRoutes` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`routeId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`routeId`) REFERENCES `routes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fav_route_unique` ON `favouriteRoutes` (`userId`,`routeId`);--> statement-breakpoint
CREATE TABLE `favouriteStops` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`stopId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stopId`) REFERENCES `stops`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fav_stop_unique` ON `favouriteStops` (`userId`,`stopId`);--> statement-breakpoint
CREATE TABLE `journeys` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`source` text NOT NULL,
	`destination` text NOT NULL,
	`routeId` text,
	`searchedAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`routeId`) REFERENCES `routes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `operatorApplications` (
	`id` text PRIMARY KEY NOT NULL,
	`companyName` text NOT NULL,
	`contactPerson` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`city` text NOT NULL,
	`numberOfBuses` integer NOT NULL,
	`currentRoutes` text NOT NULL,
	`gpsAvailable` integer NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `operatorRoutes` (
	`id` text PRIMARY KEY NOT NULL,
	`operatorId` text NOT NULL,
	`routeId` text NOT NULL,
	FOREIGN KEY (`operatorId`) REFERENCES `operators`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`routeId`) REFERENCES `routes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `operator_route_unique` ON `operatorRoutes` (`operatorId`,`routeId`);--> statement-breakpoint
CREATE TABLE `operators` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`companyName` text NOT NULL,
	`ownerName` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`city` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`verificationStatus` text DEFAULT 'PENDING' NOT NULL,
	`gpsAvailable` integer DEFAULT 0 NOT NULL,
	`totalBuses` integer DEFAULT 0 NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `operators_userId_unique` ON `operators` (`userId`);--> statement-breakpoint
CREATE TABLE `passes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`duration` integer NOT NULL,
	`price` real NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rateLimits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expiresAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resetTokens` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`used` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `routeStops` (
	`id` text PRIMARY KEY NOT NULL,
	`routeId` text NOT NULL,
	`stopId` text NOT NULL,
	`stopOrder` integer NOT NULL,
	`estimatedOffsetMinutes` integer NOT NULL,
	FOREIGN KEY (`routeId`) REFERENCES `routes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stopId`) REFERENCES `stops`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `route_stop_unique` ON `routeStops` (`routeId`,`stopId`);--> statement-breakpoint
CREATE UNIQUE INDEX `route_order_unique` ON `routeStops` (`routeId`,`stopOrder`);--> statement-breakpoint
CREATE TABLE `routes` (
	`id` text PRIMARY KEY NOT NULL,
	`routeCode` text NOT NULL,
	`routeName` text NOT NULL,
	`source` text NOT NULL,
	`destination` text NOT NULL,
	`estimatedDuration` integer NOT NULL,
	`baseFare` real NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `routes_routeCode_unique` ON `routes` (`routeCode`);--> statement-breakpoint
CREATE TABLE `savedPlaces` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`label` text NOT NULL,
	`stopId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stopId`) REFERENCES `stops`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `serviceAlerts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`severity` text NOT NULL,
	`routeId` text,
	`busId` text,
	`active` integer DEFAULT 1 NOT NULL,
	`startsAt` text NOT NULL,
	`endsAt` text,
	FOREIGN KEY (`routeId`) REFERENCES `routes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`busId`) REFERENCES `buses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expiresAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stops` (
	`id` text PRIMARY KEY NOT NULL,
	`stopName` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`city` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`fullName` text NOT NULL,
	`email` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`passwordHash` text NOT NULL,
	`role` text DEFAULT 'PASSENGER' NOT NULL,
	`profilePhoto` text,
	`disabled` integer DEFAULT 0 NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `walletTransactions` (
	`id` text PRIMARY KEY NOT NULL,
	`walletId` text NOT NULL,
	`amount` integer NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`walletId`) REFERENCES `wallets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'COMING_SOON' NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wallets_userId_unique` ON `wallets` (`userId`);